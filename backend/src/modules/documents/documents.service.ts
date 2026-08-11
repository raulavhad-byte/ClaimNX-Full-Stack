import {
  BadRequestException,
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
    uploadedBy: string;
  }) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.claimId)) {
      throw new BadRequestException('A valid claim ID is required for document upload.');
    }
    if (!input.file.size || input.file.size > DocumentsService.maxFileSizeBytes) {
      throw new BadRequestException('Claim documents must be between 1 byte and 25 MB.');
    }

    await this.ensureClaimDocumentsBucket();

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
        contentType: input.file.mimetype || 'application/octet-stream',
        upsert: false,
      },
    );

    if (uploadError) {
      throw new BadRequestException(`Unable to store claim document: ${uploadError.message}`);
    }

    try {
      const document = await this.documentsRepository.create({
        claim_id: input.claimId,
        file_name: input.file.originalname,
        file_path: `${DocumentsService.claimDocumentsBucket}/${objectPath}`,
        mime_type: input.file.mimetype || 'application/octet-stream',
        category: input.category,
        file_size: input.file.size,
        uploaded_by: input.uploadedBy,
      });

      return document;
    } catch (error) {
      await storage.remove([objectPath]);
      throw error;
    }
  }

  async findAll(filter: DocumentFilterDto) {
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

  async createPreviewUrl(id: string) {
    const document = await this.findOne(id);
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
