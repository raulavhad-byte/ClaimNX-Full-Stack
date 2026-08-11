import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  /**
   * Stores the binary object privately in Supabase Storage and persists only
   * its metadata/path in public.documents. Browser clients never receive a
   * Storage service-role key.
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 25 * 1024 * 1024 },
  }))
  upload(
    @UploadedFile() file: any,
    @Body('claim_id') claimId: string,
    @Body('category') category: string | undefined,
    @CurrentUser('id') uploadedBy: string,
  ) {
    if (!file) {
      throw new BadRequestException('A claim document file is required.');
    }

    return this.documentsService.uploadClaimFile({
      file,
      claimId,
      category,
      uploadedBy,
    });
  }

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
