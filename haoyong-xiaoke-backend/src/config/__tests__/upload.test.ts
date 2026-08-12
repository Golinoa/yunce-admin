import path from 'path';
import fs from 'fs';
import { BadRequestError } from '../../utils/errors';
import {
  persistUploadedFileAsync,
  resolveUploadDestination,
  resolveUploadPublicUrl,
  resolveUploadType,
} from '../upload';

describe('upload config', () => {
  it('uses avatar as default upload type', () => {
    expect(resolveUploadType(undefined)).toBe('avatar');
    expect(resolveUploadType('')).toBe('avatar');
  });

  it('accepts whitelisted upload type', () => {
    expect(resolveUploadType('student')).toBe('student');
  });

  it('trims safe upload type before whitelist check', () => {
    expect(resolveUploadType(' student ')).toBe('student');
  });

  it('rejects invalid upload type', () => {
    expect(() => resolveUploadType('evil')).toThrow(BadRequestError);
    expect(() => resolveUploadType('evil')).toThrow('非法的上传类型');
  });

  it('rejects traversal-like upload type variants', () => {
    const invalidTypes = [
      '../avatar',
      '..\\avatar',
      '/avatar',
      '\\avatar',
      'avatar/..',
      'avatar\\..',
      'student/profile',
      'AVATAR',
    ];

    for (const invalidType of invalidTypes) {
      expect(() => resolveUploadType(invalidType)).toThrow(BadRequestError);
      expect(() => resolveUploadDestination(invalidType)).toThrow('非法的上传类型');
    }
  });

  it('resolves upload destination inside upload root directory', () => {
    const rootDir = path.resolve('uploads');

    expect(resolveUploadDestination('lesson', rootDir)).toBe(path.resolve(rootDir, 'lesson'));
    expect(resolveUploadDestination(undefined, rootDir)).toBe(path.resolve(rootDir, 'avatar'));
  });

  it('resolves public url with upload type subdirectory preserved', () => {
    const rootDir = path.resolve('uploads');

    expect(resolveUploadPublicUrl(path.join(rootDir, 'avatar', 'file-a.png'), rootDir)).toBe(
      '/uploads/avatar/file-a.png',
    );
    expect(resolveUploadPublicUrl(path.join(rootDir, 'lesson', 'nested-file.webp'), rootDir)).toBe(
      '/uploads/lesson/nested-file.webp',
    );
  });

  it('rejects public url resolution for files outside upload root', () => {
    const rootDir = path.resolve('uploads');
    const outsideFile = path.resolve(rootDir, '..', 'file-a.png');

    expect(() => resolveUploadPublicUrl(outsideFile, rootDir)).toThrow(BadRequestError);
    expect(() => resolveUploadPublicUrl(outsideFile, rootDir)).toThrow('非法的上传文件路径');
  });

  it('persists uploaded file into the requested type directory after multipart parsing', async () => {
    const rootDir = path.resolve('tmp-upload-tests');
    const file = {
      originalname: 'avatar.png',
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    const { filePath, filename } = await persistUploadedFileAsync(file, 'student', rootDir);

    expect(filePath).toBe(path.join(rootDir, 'student', filename));
    expect(resolveUploadPublicUrl(filePath, rootDir)).toBe(`/uploads/student/${filename}`);
    expect(fs.readFileSync(filePath)).toEqual(Buffer.from('fake-image'));

    fs.rmSync(rootDir, { recursive: true, force: true });
  });
});
