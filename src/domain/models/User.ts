import mongoose, { model } from 'mongoose';

const UserScheme = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

export const User = model('User', UserScheme);
