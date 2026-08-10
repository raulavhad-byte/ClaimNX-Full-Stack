import { Injectable } from '@nestjs/common';

@Injectable()
export class DeviceDetectorService {
  detect(userAgent: string): string {
    const ua = (userAgent || '').toLowerCase();

    /**
     * Browser
     */
    let browser = 'Unknown Browser';

    if (ua.includes('edg')) {
      browser = 'Edge';
    } else if (ua.includes('chrome')) {
      browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('postman')) {
      browser = 'Postman';
    }

    /**
     * Operating System
     */
    let os = 'Unknown Device';

    if (ua.includes('windows')) {
      os = 'Windows PC';
    } else if (ua.includes('mac os')) {
      os = 'Mac';
    } else if (ua.includes('iphone')) {
      os = 'iPhone';
    } else if (ua.includes('ipad')) {
      os = 'iPad';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    }

    /**
     * API Clients
     */
    if (browser === 'Postman') {
      return 'Postman';
    }

    return `${os} - ${browser}`;
  }
}