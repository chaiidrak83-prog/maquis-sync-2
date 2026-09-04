import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_PAYMENT_KEY = 'allowPendingPayment';
export const AllowPendingPayment = () => SetMetadata(ALLOW_PENDING_PAYMENT_KEY, true);
