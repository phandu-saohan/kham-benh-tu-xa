// Dịch vụ Kiểm toán Bất biến Chuỗi băm SHA-256 (Tamper-Proof Audit Trail)
// Tuân thủ Nghị định 85/2016/NĐ-CP (Cấp độ 3) & Nghị định 13/2023/NĐ-CP

import { AuditLogItem } from '../types/telemedicine';

export interface ChainedAuditLog extends AuditLogItem {
  blockIndex: number;
  previousHash: string;
  currentHash: string;
}

export class AuditBlockchainService {
  private static genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Tính toán mã băm SHA-256 cho từng khối sự kiện EMR
   */
  public static async calculateBlockHash(
    index: number,
    timestamp: string,
    actorId: string,
    action: string,
    resource: string,
    previousHash: string
  ): Promise<string> {
    const rawData = `${index}|${timestamp}|${actorId}|${action}|${resource}|${previousHash}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Chuyển đổi danh sách log thông thường thành chuỗi băm bất biến
   */
  public static async buildAuditChain(rawLogs: AuditLogItem[]): Promise<ChainedAuditLog[]> {
    const chainedLogs: ChainedAuditLog[] = [];
    let prevHash = this.genesisHash;

    for (let i = 0; i < rawLogs.length; i++) {
      const log = rawLogs[i];
      const currentHash = await this.calculateBlockHash(
        i,
        log.timestamp,
        log.actorId,
        log.action,
        log.resource,
        prevHash
      );

      chainedLogs.push({
        ...log,
        blockIndex: i,
        previousHash: prevHash,
        currentHash
      });

      prevHash = currentHash;
    }

    return chainedLogs;
  }

  /**
   * Xác thực tính toàn vẹn của toàn bộ chuỗi nhật ký kiểm toán EMR
   */
  public static async verifyChainIntegrity(chain: ChainedAuditLog[]): Promise<{
    isValid: boolean;
    tamperedIndex?: number;
    verificationReport: string;
  }> {
    let prevHash = this.genesisHash;

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];

      // Kiểm tra liên kết khối trước
      if (block.previousHash !== prevHash) {
        return {
          isValid: false,
          tamperedIndex: i,
          verificationReport: `CẢNH BÁO AN NINH: Khối kiểm toán #${i} (${block.action}) bị đứt gãy liên kết hàm băm!`
        };
      }

      // Tính lại mã băm kiểm chứng
      const recomputedHash = await this.calculateBlockHash(
        block.blockIndex,
        block.timestamp,
        block.actorId,
        block.action,
        block.resource,
        block.previousHash
      );

      if (recomputedHash !== block.currentHash) {
        return {
          isValid: false,
          tamperedIndex: i,
          verificationReport: `PHÁT HIỆN SỬA ĐỔI TRÁI PHÉP: Khối #${i} có nội dung bị chỉnh sửa sau khi ghi!`
        };
      }

      prevHash = block.currentHash;
    }

    return {
      isValid: true,
      verificationReport: `CHUỖI KIỂM TOÁN NGUYÊN VẸN 100%: Toàn bộ ${chain.length} sự kiện kiểm toán khớp mã băm SHA-256 đạt chuẩn An toàn thông tin Cấp độ 3.`
    };
  }
}
