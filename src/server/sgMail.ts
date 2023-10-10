import sgMail from '@sendgrid/mail';
import { sgApiKey } from './env.js';
sgMail.setApiKey(sgApiKey);
export { sgMail };
