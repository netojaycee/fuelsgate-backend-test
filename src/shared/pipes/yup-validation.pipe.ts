import {
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ObjectSchema } from 'yup';
import { mergeErrors } from 'src/utils/helpers';

@Injectable()
export class YupValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema<any>) { }

  async transform(value: any) {
    try {
      return await this.schema.validateSync(value, { abortEarly: false });
    } catch (err) {
      throw new UnprocessableEntityException({
        errors: mergeErrors(err.inner.map((e) => ({ [e.path]: e.message }))),
        message: 'Validation failed',
        statusCode: 422,
      });
    }
  }
}
