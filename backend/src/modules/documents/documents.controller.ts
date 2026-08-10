import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @Post()
  create(
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    return this.documentsService.create(
      createDocumentDto,
    );
  }

  @Get()
  findAll(
    @Query() filter: DocumentFilterDto,
  ) {
    return this.documentsService.findAll(filter);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(
      id,
      updateDocumentDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.documentsService.remove(id);
  }
}