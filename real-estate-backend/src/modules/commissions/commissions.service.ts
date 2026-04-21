import { Injectable } from '@nestjs/common';

@Injectable()
export class CommissionsService {
  calculate(totalFee: number, listingAgentId: string, sellingAgentId: string) {
    const agencyShare = totalFee * 0.5; // Şirketin sabit %50 payı
    const totalAgentShare = totalFee * 0.5; // Emlakçılara kalan %50 pay

    let listingAgentShare = 0;
    let sellingAgentShare = 0;

    if (listingAgentId === sellingAgentId || !sellingAgentId || sellingAgentId === '') {
      // Senaryo 1: Portföyü getiren ve satan aynı kişi, veya satan atanmamış
      listingAgentShare = totalAgentShare;
      sellingAgentShare = 0; // Tek kalemde tutuyoruz
    } else {
      // Senaryo 2: Farklı kişiler, %25 - %25 paylaşırlar
      listingAgentShare = totalAgentShare * 0.5;
      sellingAgentShare = totalAgentShare * 0.5;
    }

    return {
      agencyShare,
      listingAgentShare,
      sellingAgentShare,
      totalFee,
    };
  }
}