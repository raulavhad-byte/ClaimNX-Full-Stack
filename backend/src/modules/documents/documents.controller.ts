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

@UseGuards(JwtAuthGuard)
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
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 25 * 1024 * 1024 },
  }))
  upload(
    @UploadedFile() file: any,
    @Body('claim_id') claimId: string,
    @Body('category') category: string | undefined,
    @CurrentUser() actor: any,
  ) {
    if (!file) {
      throw new BadRequestException('A claim document file is required.');
    }

    return this.documentsService.uploadClaimFile({
      file,
      claimId,
      category,
      actor,
    });
  }

  /** Store a hospital-owned rate list outside the users JSON profile. */
  @Post('hospital-asset/upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 25 * 1024 * 1024 },
  }))
  uploadHospitalAsset(
    @UploadedFile() file: any,
    @Body('hospital_user_id') hospitalUserId: string,
    @Body('payer_id') payerId: string | undefined,
    @CurrentUser('id') uploadedBy: string,
  ) {
    if (!file) throw new BadRequestException('A rate-list file is required.');
    return this.documentsService.uploadHospitalRateList({
      file,
      hospitalUserId,
      payerId,
      uploadedBy,
    });
  }

  @Get('hospital-asset/preview')
  previewHospitalAsset(
    @Query('path') path: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.documentsService.createHospitalAssetPreviewUrl(path, userId);
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
    @CurrentUser() actor: any,
  ) {
    return this.documentsService.findAll(filter, actor);
  }

  @Get('claim/:claimId/resolve')
  resolveClaimDocument(
    @Param('claimId') claimId: string,
    @CurrentUser() actor: any,
    @Query('document_id') documentId?: string,
    @Query('file_name') fileName?: string,
    @Query('category') category?: string,
    @Query('uploaded_at') uploadedAt?: string,
  ) {
    return this.documentsService.resolveClaimDocument({
      claimId,
      documentId,
      fileName,
      category,
      uploadedAt,
      actor,
    });
  }

  @Get(':id/preview')
  preview(
    @Param('id') id: string,
    @CurrentUser() actor: any,
  ) {
    return this.documentsService.createPreviewUrl(id, actor);
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
    @CurrentUser() actor: any,
  ) {
    return this.documentsService.remove(id, actor);
  }
}
