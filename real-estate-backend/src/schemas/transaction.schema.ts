import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  totalServiceFee!: number;

  @Prop({ required: true, enum: ['agreement', 'earnest_money', 'title_deed', 'completed', 'canceled'], default: 'agreement' })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  listingAgentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  sellingAgentId?: Types.ObjectId;

  @Prop({ type: Object })
  financialBreakdown?: any;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);