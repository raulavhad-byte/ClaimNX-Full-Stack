import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DocumentsRepository } from './documents.repository';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
  ) {}

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