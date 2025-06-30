import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Request,
    Response,
    UseGuards,
} from '@nestjs/common';
import { RatingService } from '../services/rating.service';
import { CreateRatingDto, RatingQueryDto } from '../dto/rating.dto';
import { AuditLog } from 'src/shared/decorators/audit-log.decorator';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';
import { createRatingSchema } from '../validations/rating.validation';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingController {
    constructor(private readonly ratingService: RatingService) { }

    @Post()
    @AuditLog({ action: 'CREATE_RATING', module: 'RATING' })
    async createRating(
        @Request() req,
        @Body(new YupValidationPipe(createRatingSchema)) body: CreateRatingDto,
        @Response() res,
    ) {
        const { user } = req;
        const data = await this.ratingService.createRating(body, user);
        return res.status(201).json({
            message: 'Rating created successfully',
            data,
            statusCode: 201,
        });
    }

    @Get('user/:userId')
    async getUserRatings(
        @Param('userId') userId: string,
        @Query() query: RatingQueryDto,
        @Response() res,
    ) {
        const data = await this.ratingService.getUserRatings({ ...query, userId });
        return res.status(200).json({
            message: 'User ratings fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Get('user/:userId/stats')
    async getUserRatingStats(
        @Param('userId') userId: string,
        @Response() res,
    ) {
        const data = await this.ratingService.getUserRatingStats(userId);
        return res.status(200).json({
            message: 'User rating statistics fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Get('my-ratings')
    async getMyRatingsGiven(
        @Request() req,
        @Query() query: RatingQueryDto,
        @Response() res,
    ) {
        const { user } = req;
        const data = await this.ratingService.getMyRatingsGiven(user, query);
        return res.status(200).json({
            message: 'Your ratings fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Delete(':ratingId')
    @AuditLog({ action: 'DELETE_RATING', module: 'RATING' })
    async deleteRating(
        @Request() req,
        @Param('ratingId') ratingId: string,
        @Response() res,
    ) {
        const { user } = req;
        const data = await this.ratingService.deleteRating(ratingId, user);
        return res.status(200).json({
            message: 'Rating deleted successfully',
            data,
            statusCode: 200,
        });
    }

    @Post('admin/recalculate-averages')
    @AuditLog({ action: 'RECALCULATE_ALL_RATING_AVERAGES', module: 'RATING' })
    async recalculateAllUserAverages(
        @Request() req,
        @Response() res,
    ) {
        const { user } = req;
        const data = await this.ratingService.recalculateAllUserAverages(user);
        return res.status(200).json({
            message: 'User rating averages recalculated successfully',
            data,
            statusCode: 200,
        });
    }

    @Post('admin/recalculate-user/:userId')
    @AuditLog({ action: 'RECALCULATE_USER_RATING_AVERAGE', module: 'RATING' })
    async recalculateUserAverage(
        @Param('userId') userId: string,
        @Request() req,
        @Response() res,
    ) {
        const { user } = req;
        const data = await this.ratingService.recalculateUserAverage(userId, user);
        return res.status(200).json({
            message: 'User rating average recalculated successfully',
            data,
            statusCode: 200,
        });
    }
}
