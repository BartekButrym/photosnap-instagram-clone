import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import {
  FileSizeValidationPipe,
  FileTypeValidationPipe,
} from './file-validation.pipe';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadFile(
    @UploadedFile(new FileSizeValidationPipe(), new FileTypeValidationPipe())
    file: Express.Multer.File,
  ) {
    return this.uploadService.uploadImage(file);
  }
}
