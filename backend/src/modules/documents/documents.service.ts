import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { DatabaseService } from '../../database/database.service';
import { DocumentsRepository } from './documents.repository';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly databaseService: DatabaseService,
  ) {}

  private static readonly claimDocumentsBucket = 'claim-documents';
  private static readonly hospitalAssetsBucket = 'hospital-assets';
  private static readonly maxFileSizeBytes = 25 * 1024 * 1024;

  private async assertClaimAccess(claimId: string, actor: {
    id: string;
    hospitalId?: string | null;
    role?: string | null;
    permissions?: unknown;
    profileData?: unknown;
  }) {
    const { data: claim, error } = await this.databaseService.getClient()
      .from('claims')
      .select('id, hospital_id, organization_id')
      .eq('id', claimId)
      .eq('is_deleted', false)
      .maybeSingle<{ id: string; hospital_id: string | null; organization_id: string | null }>();
    if (error) throw error;
    if (!claim) throw new NotFoundException('Claim not found.');

    const role = String(actor.role ?? '').trim().toUpperCase();
    const permissions = Array.isArray(actor.permissions) ? actor.permissions.map(String) : [];
    const hasGlobalAccess = role === 'SUPER ADMIN' || permissions.includes('all');
    if (!hasGlobalAccess) {
      const profile = actor.profileData && typeof actor.profileData === 'object'
        ? actor.profileData as Record<string, unknown>
        : {};
      const assignedHospitalIds = Array.isArray(profile.assignedHospitalIds)
        ? profile.assignedHospitalIds.map(String)
        : [];
      const scopedStates = Array.isArray(profile.states) ? profile.states.map(String) : [];
      const scopedDistricts = Array.isArray(profile.districts) ? profile.districts.map(String) : [];
      let hasHospitalAccess = claim.hospital_id === actor.hospitalId ||
        (!!claim.hospital_id && assignedHospitalIds.includes(claim.hospital_id));

      if (!hasHospitalAccess && claim.hospital_id && (scopedStates.length || scopedDistricts.length)) {
        const { data: hospital, error: hospitalError } = await this.databaseService.getClient()
          .from('hospitals')
          .select('state, district')
          .eq('id', claim.hospital_id)
          .eq('is_deleted', false)
          .maybeSingle<{ state: string | null; district: string | null }>();
        if (hospitalError) throw hospitalError;
        const stateMatches = scopedStates.length === 0 || (!!hospital?.state && scopedStates.includes(hospital.state));
        const districtMatches = scopedDistricts.length === 0 || (!!hospital?.district && scopedDistricts.includes(hospital.district));
        hasHospitalAccess = stateMatches && districtMatches;
      }

      if (!hasHospitalAccess) {
        throw new ForbiddenException('You do not have access to documents for this hospital claim.');
      }
    }
    return claim;
  }

  private async ensurePrivateBucket(bucket: string) {
    const storage = this.databaseService.getClient().storage;
    const { error } = await storage.getBucket(bucket);
    if (!error) return;

    const { error: createError } = await storage.createBucket(
      bucket,
      {
        public: false,
        fileSizeLimit: DocumentsService.maxFileSizeBytes,
      },
    );

    // A concurrent first upload may create the bucket between the two calls.
    if (createError && !/already exists/i.test(createError.message)) {
      throw new BadRequestException(
        `Unable to initialise private claim document storage: ${createError.message}`,
      );
    }
  }

  private async ensureClaimDocumentsBucket() {
    return this.ensurePrivateBucket(DocumentsService.claimDocumentsBucket);
  }

  private async ensureHospitalAssetsBucket() {
    return this.ensurePrivateBucket(DocumentsService.hospitalAssetsBucket);
  }

  async uploadHospitalRateList(input: {
    file: { buffer: Buffer; originalname: string; mimetype?: string; size: number };
    hospitalUserId: string;
    payerId?: string;
    uploadedBy: string;
  }) {
    if (!input.hospitalUserId || input.hospitalUserId !== input.uploadedBy) {
      throw new BadRequestException('Rate lists can only be uploaded for the signed-in hospital.');
    }
    if (!input.file.size || input.file.size > DocumentsService.maxFileSizeBytes) {
      throw new BadRequestException('Rate lists must be between 1 byte and 25 MB.');
    }

    await this.ensureHospitalAssetsBucket();
    const safeFileName = input.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+/, '') || 'rate-list';
    const safePayer = String(input.payerId ?? 'payer').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'payer';
    const objectPath = `hospitals/${input.hospitalUserId}/rate-lists/${safePayer}/${randomUUID()}-${safeFileName}`;
    const { error } = await this.databaseService.getClient().storage
      .from(DocumentsService.hospitalAssetsBucket)
      .upload(objectPath, input.file.buffer, {
        contentType: input.file.mimetype || 'application/octet-stream',
        upsert: false,
      });
    if (error) throw new BadRequestException(`Unable to store rate list: ${error.message}`);

    return {
      storage_path: objectPath,
      file_name: input.file.originalname,
      mime_type: input.file.mimetype || 'application/octet-stream',
      file_size: input.file.size,
    };
  }

  async createHospitalAssetPreviewUrl(storagePath: string, userId: string) {
    const expectedPrefix = `hospitals/${userId}/rate-lists/`;
    if (!storagePath?.startsWith(expectedPrefix) || storagePath.includes('..')) {
      throw new BadRequestException('Invalid hospital asset path.');
    }
    const { data, error } = await this.databaseService.getClient().storage
      .from(DocumentsService.hospitalAssetsBucket)
      .createSignedUrl(storagePath, 10 * 60);
    if (error || !data?.signedUrl) {
      throw new BadRequestException(error?.message ?? 'Unable to create a secure rate-list preview.');
    }
    return { preview_url: data.signedUrl, preview_expires_in: 10 * 60 };
  }

  async uploadClaimFile(input: {
    file: { buffer: Buffer; originalname: string; mimetype?: string; size: number };
    claimId: string;
    category?: string;
    actor: { id: string; hospitalId?: string | null; role?: string | null; permissions?: unknown; profileData?: unknown };
  }) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.claimId)) {
      throw new BadRequestException('A valid claim ID is required for document upload.');
    }
    if (!input.file.size || input.file.size > DocumentsService.maxFileSizeBytes) {
      throw new BadRequestException('Claim documents must be between 1 byte and 25 MB.');
    }

    await this.assertClaimAccess(input.claimId, input.actor);
    await this.ensureClaimDocumentsBucket();

    const mimeType = this.resolveMimeType(input.file.originalname, input.file.mimetype);
    const safeFileName = input.file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^_+/, '') || 'claim-document';
    const objectPath = `claims/${input.claimId}/${randomUUID()}-${safeFileName}`;
    const storage = this.databaseService.getClient().storage
      .from(DocumentsService.claimDocumentsBucket);
    const { error: uploadError } = await storage.upload(
      objectPath,
      input.file.buffer,
      {
        contentType: mimeType,
        upsert: false,
      },
    );

    if (uploadError) {
      throw new BadRequestException(`Unable to store claim document: ${uploadError.message}`);
    }

    let document: any;
    try {
      document = await this.documentsRepository.create({
        claim_id: input.claimId,
        file_name: input.file.originalname,
        file_path: `${DocumentsService.claimDocumentsBucket}/${objectPath}`,
        mime_type: mimeType,
        category: input.category,
        file_size: input.file.size,
        uploaded_by: input.actor.id,
      });

      // The documents table is the source of truth. Persist its ID in the
      // claim workflow data so every timeline entry can resolve the same
      // private Storage object after a reload or for another authorised user.
      await this.linkDocumentToClaimTimeline({ claimId: input.claimId, document });
      return document;
    } catch (error) {
      // Keep object storage and the database registry atomic from the
      // caller's perspective.  A failed timeline link must not leave an
      // orphaned database document pointing at a removed Storage object.
      if (document?.id) {
        await this.documentsRepository.delete(document.id).catch(() => undefined);
      }
      await storage.remove([objectPath]);
      throw error;
    }
  }

  private async linkDocumentToClaimTimeline(input: { claimId: string; document: any }) {
    const { data: claim, error: claimError } = await this.databaseService
      .getClient()
      .from('claims')
      .select('id, form_data')
      .eq('id', input.claimId)
      .eq('is_deleted', false)
      .maybeSingle<{ id: string; form_data: Record<string, any> | null }>();
    if (claimError) throw claimError;
    if (!claim) throw new NotFoundException('Claim not found for uploaded document.');

    const formData = claim.form_data && typeof claim.form_data === 'object' ? claim.form_data : {};
    const reference = {
      documentId: input.document.id,
      name: input.document.file_name,
      type: input.document.category || 'Claim Document',
      mimeType: input.document.mime_type || 'application/octet-stream',
      uploadedAt: input.document.uploaded_at || new Date().toISOString(),
      fileSize: input.document.file_size ?? null,
    };
    const upsertDocumentReference = (documents: any[]) => {
      const normalisedName = this.normaliseFileName(reference.name);

      // The claim update happens before the multipart upload, so the latest
      // workflow event can contain a lightweight, unlinked document entry.
      // Replace that temporary entry rather than leaving a second, broken
      // "View" item alongside the persisted document.
      const retained = documents.filter((item: any) => {
        if (item?.documentId === reference.documentId) return false;
        return item?.documentId || this.normaliseFileName(item?.name) !== normalisedName;
      });

      return [...retained, reference];
    };

    const existingDocuments = Array.isArray(formData.uploadedDocuments) ? formData.uploadedDocuments : [];
    const uploadedDocuments = upsertDocumentReference(existingDocuments);
    const history = Array.isArray(formData.history) ? [...formData.history] : [];

    if (history.length > 0) {
      // Claim timeline entries are prepended by every workflow command. Use
      // the greatest timestamp instead of assuming insertion order so uploads
      // are always linked to the latest real business event.
      const latestIndex = history.reduce((bestIndex: number, entry: any, index: number) => {
        const bestTime = Date.parse(history[bestIndex]?.date ?? '') || 0;
        const entryTime = Date.parse(entry?.date ?? '') || 0;
        return entryTime > bestTime ? index : bestIndex;
      }, 0);
      const latest = history[latestIndex] && typeof history[latestIndex] === 'object' ? history[latestIndex] : {};
      const stageData = latest.stageData && typeof latest.stageData === 'object' ? latest.stageData : {};
      const eventDocuments = Array.isArray(stageData.documents) ? stageData.documents : [];
      history[latestIndex] = {
        ...latest,
        stageData: { ...stageData, documents: upsertDocumentReference(eventDocuments) },
      };
    }

    const { error: updateError } = await this.databaseService
      .getClient()
      .from('claims')
      .update({ form_data: { ...formData, uploadedDocuments, history }, updated_at: new Date().toISOString() })
      .eq('id', input.claimId)
      .eq('is_deleted', false);
    if (updateError) throw updateError;
  }

  async findAll(
    filter: DocumentFilterDto,
    actor: { id: string; hospitalId?: string | null; role?: string | null; permissions?: unknown; profileData?: unknown },
  ) {
    // Documents are never a global directory. Every supported browser list
    // is claim-scoped, which lets us enforce the claim's hospital boundary
    // before returning even file names or categories.
    if (!filter.claim_id) {
      throw new BadRequestException('A claim_id is required when listing documents.');
    }
    await this.assertClaimAccess(filter.claim_id, actor);
    return this.documentsRepository.findAll({
      page: filter.page,
      limit: filter.limit,

      search: filter.search,

      filters: {
        ...(filter.claim_id && {
          claim_id: filter.claim_id,
        }),
        ...(filter.category && {
          category: filter.category,
        }),
      },

      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    });
  }

  async findOne(id: string) {
    const document =
      await this.documentsRepository.findById(id);

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    return document;
  }

  /**
   * Resolve a document referenced by workflow/timeline metadata.  The browser
   * must never guess a Storage path or substitute an unrelated file: this
   * endpoint verifies ownership by claim_id before returning the document ID
   * used for the signed preview URL.
   */
  async resolveClaimDocument(input: {
    claimId: string;
    documentId?: string;
    fileName?: string;
    category?: string;
    actor: { id: string; hospitalId?: string | null; role?: string | null; permissions?: unknown; profileData?: unknown };
  }) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.claimId)) {
      throw new BadRequestException('A valid claim ID is required.');
    }

    await this.assertClaimAccess(input.claimId, input.actor);

    if (input.documentId) {
      const { data, error } = await this.databaseService.getClient()
        .from('documents')
        .select('*')
        .eq('id', input.documentId)
        .eq('claim_id', input.claimId)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
    }

    const { data, error } = await this.databaseService.getClient()
      .from('documents')
      .select('*')
      .eq('claim_id', input.claimId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;

    const claimDocuments = data ?? [];
    const requestedName = this.normaliseFileName(input.fileName);
    const nameMatches = claimDocuments.filter((document: any) =>
      this.normaliseFileName(document.file_name) === requestedName,
    );
    if (requestedName && nameMatches.length === 1) return nameMatches[0];
    if (nameMatches.length > 1) {
      throw new BadRequestException('More than one stored document matches this timeline entry.');
    }

    // Historic workflow entries did not persist a document ID. Their display
    // label can differ from the uploaded file name, but the document category
    // is still reliable (for example, "Discharge Summary"). Resolve that
    // only when it identifies one and only one document belonging to this
    // claim; never substitute a document from another claim.
    const requestedCategory = this.normaliseFileName(input.category);
    const categoryMatches = requestedCategory
      ? claimDocuments.filter((document: any) =>
          this.normaliseFileName(document.category) === requestedCategory,
        )
      : [];
    if (categoryMatches.length === 1) return categoryMatches[0];
    if (categoryMatches.length > 1) {
      throw new BadRequestException('More than one stored document matches this timeline category.');
    }

    // A single stored document is unambiguous even if the legacy timeline
    // contains only a generic label. This is intentionally limited to one
    // claim-scoped record so it cannot expose or substitute another upload.
    if (claimDocuments.length === 1) return claimDocuments[0];

    throw new NotFoundException('The selected document is not available in the claim registry.');
  }

  private normaliseFileName(value?: string) {
    return String(value ?? '')
      .trim()
      .toLocaleLowerCase()
      .replace(/\.[a-z0-9]{1,8}$/i, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  private resolveMimeType(fileName: string, mimeType?: string) {
    // Browser File/Blob objects reconstructed from legacy Base64 uploads can
    // lose their MIME type. Preserve an explicit PDF type so Storage and
    // every authorised browser can render it inline rather than download it.
    if (/\.pdf$/i.test(fileName)) return 'application/pdf';
    return mimeType || 'application/octet-stream';
  }

  async createPreviewUrl(id: string, actor: { id: string; hospitalId?: string | null; role?: string | null; permissions?: unknown; profileData?: unknown }) {
    const document = await this.findOne(id);
    if (!document.claim_id) throw new BadRequestException('This document is not linked to a claim.');
    await this.assertClaimAccess(document.claim_id, actor);
    const bucketPrefix = `${DocumentsService.claimDocumentsBucket}/`;
    if (!document.file_path?.startsWith(bucketPrefix)) {
      throw new BadRequestException('This document is not stored in the secure claim document bucket.');
    }

    const objectPath = document.file_path.slice(bucketPrefix.length);
    const { data, error } = await this.databaseService
      .getClient()
      .storage
      .from(DocumentsService.claimDocumentsBucket)
      .createSignedUrl(objectPath, 10 * 60);
    if (error || !data?.signedUrl) {
      throw new BadRequestException(error?.message ?? 'Unable to create a secure document preview.');
    }

    return {
      ...document,
      preview_url: data.signedUrl,
      preview_expires_in: 10 * 60,
    };
  }

  async create(dto: CreateDocumentDto) {
    return this.documentsRepository.create(dto);
  }

  async update(
    id: string,
    dto: UpdateDocumentDto,
  ) {
    return this.documentsRepository.update(id, dto);
  }

  async remove(id: string) {
    const document =
      await this.documentsRepository.findById(id);

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    await this.documentsRepository.delete(id);

    return {
      message: 'Document deleted successfully',
    };
  }
}
