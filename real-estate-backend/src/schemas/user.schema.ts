import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ default: '' })
  password!: string;

  @Prop({ default: 'agent' })
  role!: string;

  @Prop({ default: '' })
  phone!: string;

  @Prop({ default: '' })
  bio!: string;

  @Prop({ default: '' })
  photo!: string;

  @Prop({ default: '' })
  location!: string;

  @Prop({ default: '' })
  instagram!: string;

  @Prop({ default: '' })
  linkedin!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);