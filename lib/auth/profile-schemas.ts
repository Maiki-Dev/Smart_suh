import 'server-only';

import { z } from 'zod';

const emptyToNull = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return null;
  return value;
};

export const userProfileSchema = z.object({
  first_name: z.string().trim().min(1, 'Нэр оруулна уу').max(100),
  last_name: z.string().trim().min(1, 'Овог оруулна уу').max(100),
  phone: z.preprocess(emptyToNull, z.string().max(32).nullable().optional()),
});

export const changeUserPasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Одоогийн нууц үг оруулна уу'),
    new_password: z.string().min(8, 'Шинэ нууц үг хамгийн багадаа 8 тэмдэгт'),
    confirm_password: z.string().min(1, 'Нууц үг давтан оруулна уу'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Нууц үг таарахгүй байна',
    path: ['confirm_password'],
  });

export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type ChangeUserPasswordInput = z.infer<typeof changeUserPasswordSchema>;
