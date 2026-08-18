import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

import { UsersRepository } from './users.repository';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService,
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  private static readonly profileAssetsBucket = 'profile-assets';
  private static readonly maxAvatarSize = 5 * 1024 * 1024;
  private static readonly avatarMimeTypes = new Map([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ]);
  private static readonly profileAssetKinds: Record<string, { field: string; legacyField: string; folder: string }> = {
    HOSPITAL_SEAL: { field: 'hospitalSealStoragePath', legacyField: 'hospitalSeal', folder: 'hospital-seal' },
    DOCTOR_STAMP: { field: 'doctorStampStoragePath', legacyField: 'doctorStamp', folder: 'doctor-stamp' },
  };

  async findAll(filter: UserFilterDto) {
    return this.usersRepository.findAll({
      page: filter.page,
      limit: filter.limit,

      search: filter.search,

      filters: {
        status: filter.status,
        is_deleted: false,
      },

      sortBy: filter.sortBy,
      sortOrder: filter.sortOrder,
    });
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user || user.is_deleted) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    options: { isSelfUpdate?: boolean } = {},
  ) {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // A user can update their own profile/configuration (such as hospital
    // onboarding and payer tie-ups), but never their access identity. Role,
    // entity and hospital assignment changes remain administrator-only.
    if (!options.isSelfUpdate && dto.email !== undefined) payload.email = dto.email;
    if (dto.displayName !== undefined) payload.display_name = dto.displayName;
    if (!options.isSelfUpdate) {
      if (dto.role !== undefined) payload.role = dto.role;
      if (dto.roleId !== undefined) {
        payload.role_id = dto.roleId;
      } else if (dto.role !== undefined) {
        payload.role_id = await this.resolveRoleId(dto.role);
      }
    }
    if (!options.isSelfUpdate && dto.hospitalId !== undefined) {
      const hospitalId = await this.resolveHospitalId(dto.hospitalId);
      // Legacy UI flows can supply another user UUID as a hospital ID. Do
      // not overwrite an existing valid association with that invalid value.
      if (hospitalId) payload.hospital_id = hospitalId;
    }
    if (dto.mobileNo !== undefined) payload.mobile_no = dto.mobileNo;
    if (!options.isSelfUpdate && dto.entityType !== undefined) payload.entity_type = dto.entityType;
    if (dto.profileData !== undefined) {
      // Profile forms are intentionally partial.  Replacing the JSON document
      // here caused fields written by another screen (including the persisted
      // avatar reference) to disappear on the next save.
      const currentUser = await this.findOne(id);
      const profileData = {
        ...this.asProfileData(currentUser.profile_data),
        ...dto.profileData,
      };
      // Never allow a JSON profile document to masquerade as an IAM record.
      delete profileData.isAdmin;
      delete profileData.role;
      delete profileData.roleId;
      delete profileData.permissions;
      delete profileData.hospitalId;
      delete profileData.entityType;
      payload.profile_data = profileData;
    }

    return this.usersRepository.update(id, payload);
  }

  async remove(id: string) {
    await this.usersRepository.update(id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    });

    return {
      message: 'User deleted successfully',
    };
  }

  async uploadAvatar(
    id: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string; size: number } | undefined,
    actor: { id: string; hospitalId?: string | null },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('A profile image is required.');
    if (file.size > UsersService.maxAvatarSize) {
      throw new BadRequestException('Profile images must not exceed 5 MB.');
    }
    const mimeType = String(file.mimetype ?? '').toLowerCase();
    const extension = UsersService.avatarMimeTypes.get(mimeType);
    if (!extension || !this.hasValidImageSignature(file.buffer, mimeType)) {
      throw new BadRequestException('Only valid JPG, PNG, and WEBP profile images are supported.');
    }

    const user = await this.findOne(id);
    const profileData = this.asProfileData(user.profile_data);
    await this.ensureProfileAssetsBucket();
    const objectPath = `users/${id}/avatar/${randomUUID()}.${extension}`;
    const storage = this.databaseService.getClient().storage.from(UsersService.profileAssetsBucket);
    const { error: uploadError } = await storage.upload(objectPath, file.buffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw new BadRequestException(`Unable to store profile image: ${uploadError.message}`);

    try {
      await this.usersRepository.update(id, {
        profile_data: { ...profileData, photoStoragePath: objectPath },
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      await storage.remove([objectPath]);
      throw error;
    }

    const previousPath = this.safeAvatarPath(profileData.photoStoragePath, id);
    if (previousPath && previousPath !== objectPath) await storage.remove([previousPath]);
    await this.auditService.log({
      hospital_id: actor.hospitalId ?? user.hospital_id ?? null,
      user_id: actor.id,
      module: 'USERS',
      action: 'PROFILE_AVATAR_UPDATED',
      entity: 'USER',
      entity_id: id,
      new_values: { mimeType, size: file.size },
    });
    return this.createAvatarResponse(objectPath);
  }

  async getAvatarUrl(id: string) {
    const user = await this.findOne(id);
    const objectPath = this.safeAvatarPath(this.asProfileData(user.profile_data).photoStoragePath, id);
    if (!objectPath) return { avatar_url: null, expires_in: 0 };
    return this.createAvatarResponse(objectPath);
  }

  async deleteAvatar(id: string, actor: { id: string; hospitalId?: string | null }) {
    const user = await this.findOne(id);
    const profileData = this.asProfileData(user.profile_data);
    const objectPath = this.safeAvatarPath(profileData.photoStoragePath, id);
    delete profileData.photoStoragePath;
    delete profileData.photoURL;
    await this.usersRepository.update(id, {
      profile_data: profileData,
      updated_at: new Date().toISOString(),
    });
    if (objectPath) {
      await this.databaseService.getClient().storage
        .from(UsersService.profileAssetsBucket)
        .remove([objectPath]);
    }
    await this.auditService.log({
      hospital_id: actor.hospitalId ?? user.hospital_id ?? null,
      user_id: actor.id,
      module: 'USERS',
      action: 'PROFILE_AVATAR_REMOVED',
      entity: 'USER',
      entity_id: id,
    });
    return { removed: true };
  }

  async uploadProfileAsset(
    id: string,
    rawKind: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string; size: number } | undefined,
    actor: { id: string; hospitalId?: string | null },
  ) {
    const asset = this.resolveProfileAssetKind(rawKind);
    if (!file?.buffer?.length) throw new BadRequestException('An image file is required.');
    if (file.size > UsersService.maxAvatarSize) throw new BadRequestException('Profile assets must not exceed 5 MB.');
    const mimeType = String(file.mimetype ?? '').toLowerCase();
    const extension = UsersService.avatarMimeTypes.get(mimeType);
    if (!extension || !this.hasValidImageSignature(file.buffer, mimeType)) {
      throw new BadRequestException('Only valid JPG, PNG, and WEBP images are supported.');
    }
    const user = await this.findOne(id);
    const profileData = this.asProfileData(user.profile_data);
    await this.ensureProfileAssetsBucket();
    const objectPath = `users/${id}/${asset.folder}/${randomUUID()}.${extension}`;
    const storage = this.databaseService.getClient().storage.from(UsersService.profileAssetsBucket);
    const { error: uploadError } = await storage.upload(objectPath, file.buffer, {
      contentType: mimeType, cacheControl: '3600', upsert: false,
    });
    if (uploadError) throw new BadRequestException(`Unable to store profile asset: ${uploadError.message}`);
    const previousPath = this.safeProfileAssetPath(profileData[asset.field], id, asset.folder);
    try {
      delete profileData[asset.legacyField];
      await this.usersRepository.update(id, {
        profile_data: { ...profileData, [asset.field]: objectPath },
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      await storage.remove([objectPath]);
      throw error;
    }
    if (previousPath && previousPath !== objectPath) await storage.remove([previousPath]);
    await this.auditService.log({
      hospital_id: actor.hospitalId ?? user.hospital_id ?? null,
      user_id: actor.id,
      module: 'USERS', action: `${rawKind.toUpperCase()}_UPDATED`, entity: 'USER', entity_id: id,
      new_values: { mimeType, size: file.size },
    });
    return this.createProfileAssetResponse(objectPath);
  }

  async getProfileAssetUrl(id: string, rawKind: string) {
    const asset = this.resolveProfileAssetKind(rawKind);
    const user = await this.findOne(id);
    const objectPath = this.safeProfileAssetPath(this.asProfileData(user.profile_data)[asset.field], id, asset.folder);
    if (!objectPath) return { asset_url: null, storage_path: null, expires_in: 0 };
    return this.createProfileAssetResponse(objectPath);
  }

  async deleteProfileAsset(id: string, rawKind: string, actor: { id: string; hospitalId?: string | null }) {
    const asset = this.resolveProfileAssetKind(rawKind);
    const user = await this.findOne(id);
    const profileData = this.asProfileData(user.profile_data);
    const objectPath = this.safeProfileAssetPath(profileData[asset.field], id, asset.folder);
    delete profileData[asset.field];
    delete profileData[asset.legacyField];
    await this.usersRepository.update(id, { profile_data: profileData, updated_at: new Date().toISOString() });
    if (objectPath) await this.databaseService.getClient().storage.from(UsersService.profileAssetsBucket).remove([objectPath]);
    await this.auditService.log({
      hospital_id: actor.hospitalId ?? user.hospital_id ?? null,
      user_id: actor.id,
      module: 'USERS', action: `${rawKind.toUpperCase()}_REMOVED`, entity: 'USER', entity_id: id,
    });
    return { removed: true };
  }

  private asProfileData(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, any>) }
      : {};
  }

  private safeAvatarPath(value: unknown, userId: string): string | null {
    const path = typeof value === 'string' ? value : '';
    return path.startsWith(`users/${userId}/avatar/`) && !path.includes('..') ? path : null;
  }

  private resolveProfileAssetKind(rawKind: string) {
    const kind = String(rawKind ?? '').trim().toUpperCase().replace(/-/g, '_');
    const asset = UsersService.profileAssetKinds[kind];
    if (!asset) throw new BadRequestException('Unsupported profile asset kind.');
    return asset;
  }

  private safeProfileAssetPath(value: unknown, userId: string, folder: string): string | null {
    const path = typeof value === 'string' ? value : '';
    return path.startsWith(`users/${userId}/${folder}/`) && !path.includes('..') ? path : null;
  }

  private hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimeType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimeType === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return false;
  }

  private async ensureProfileAssetsBucket() {
    const storage = this.databaseService.getClient().storage;
    const { error } = await storage.getBucket(UsersService.profileAssetsBucket);
    if (!error) return;
    const { error: createError } = await storage.createBucket(UsersService.profileAssetsBucket, {
      public: false,
      fileSizeLimit: UsersService.maxAvatarSize,
      allowedMimeTypes: [...UsersService.avatarMimeTypes.keys()],
    });
    if (createError && !/already exists/i.test(createError.message)) {
      throw new BadRequestException(`Unable to initialise profile image storage: ${createError.message}`);
    }
  }

  private async createAvatarResponse(objectPath: string) {
    const { data, error } = await this.databaseService.getClient().storage
      .from(UsersService.profileAssetsBucket)
      .createSignedUrl(objectPath, 10 * 60);
    if (error || !data?.signedUrl) {
      throw new BadRequestException(error?.message ?? 'Unable to create a secure profile image preview.');
    }
    return { avatar_url: data.signedUrl, storage_path: objectPath, expires_in: 10 * 60 };
  }

  private async createProfileAssetResponse(objectPath: string) {
    const { data, error } = await this.databaseService.getClient().storage
      .from(UsersService.profileAssetsBucket).createSignedUrl(objectPath, 10 * 60);
    if (error || !data?.signedUrl) {
      throw new BadRequestException(error?.message ?? 'Unable to create a secure asset preview.');
    }
    return { asset_url: data.signedUrl, storage_path: objectPath, expires_in: 10 * 60 };
  }

  private async resolveRoleId(roleName: string): Promise<string> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('roles')
      .select('id')
      .eq('name', roleName.trim())
      .eq('status', 'Active')
      .maybeSingle();

    if (error || !data?.id) {
      throw new NotFoundException(`Active role "${roleName}" was not found.`);
    }

    return String(data.id);
  }

  private async resolveHospitalId(hospitalId: string): Promise<string | null> {
    const { data, error } = await this.databaseService
      .getClient()
      .from('hospitals')
      .select('id')
      .eq('id', hospitalId)
      .maybeSingle();

    if (error || !data?.id) return null;
    return String(data.id);
  }
}
