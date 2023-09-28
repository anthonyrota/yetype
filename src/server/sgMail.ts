import sgMail from '@sendgrid/mail';
import { sgApiKey } from './secrets.js';
sgMail.setApiKey(sgApiKey);
export { sgMail };
