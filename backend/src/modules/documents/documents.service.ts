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
  private static readonly maxFileSizeBytes = 25 * 1024 * 1024;

  private async ensureClaimDocumentsBucket() {
    const storage = this.databaseService.getClient().storage;
    const { error } = await storage.getBucket(DocumentsService.claimDocumentsBucket);
    if (!error) return;

    const { error: createError } = await storage.createBucket(
      DocumentsService.claimDocumentsBucket,
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
