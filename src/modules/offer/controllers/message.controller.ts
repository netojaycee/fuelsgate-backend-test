import { MessageService } from "../services/message.service";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Response } from "@nestjs/common";
import { YupValidationPipe } from "src/shared/pipes/yup-validation.pipe";
import { messageSchema, messageStatusSchema } from "../validations/message.validation";
import { MessageDto, MessageQueryDto } from "../dto/message.dto";

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) { }

  @Get(':offerId')
  async getAll(
    @Param() param,
    @Query() query: MessageQueryDto,
    @Response() res,
  ): Promise<[]> {
    const { offerId } = param
    const data = await this.messageService.getAllMessages(query, offerId);
    return res.status(200).json({
      message: 'Offers fetched successfully',
      data,
      statusCode: 200,
    });
  }


  @Get('show/:messageId')
  async getDetails(
    @Param() param,
    @Response() res,
  ): Promise<[]> {
    const { messageId } = param
    const data = await this.messageService.getMessageDetail(messageId);
    return res.status(200).json({
      message: 'Message fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Post()
  async create(
    @Request() req,
    @Body(new YupValidationPipe(messageSchema)) body: MessageDto,
    @Response() res,
  ): Promise<[]> {
    const { user } = req
    const data = await this.messageService.sendMessage(body, user);
    // this.messageGateway.handleMessage()
    return res.status(200).json({
      message: 'Offer sent successfully',
      data,
      statusCode: 200,
    });
  }

  @Patch('status/:messageId')
  async updateStatus(
    @Request() req,
    @Param() param,
    @Body(new YupValidationPipe(messageStatusSchema)) body,
    @Response() res,
  ): Promise<[]> {
    const { messageId } = param
    const { user } = req
    const data = await this.messageService.updateMessageDetail(messageId, body, user);
    return res.status(200).json({
      message: 'Message updated successfully',
      data,
      statusCode: 200,
    });
  }

  @Delete(':messageId')
  async delete(
    @Param() param,
    @Response() res,
  ): Promise<[]> {
    const { messageId } = param
    await this.messageService.delete(messageId);
    return res.status(200).json({
      message: 'Message deleted successfully',
      statusCode: 200,
    });
  }
}