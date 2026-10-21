# ==============================================================================
# DOCKERFILE - HỆ THỐNG KHÁM BỆNH TỪ XA TÍCH HỢP HIS/EMR (PRODUCTION IMAGE)
# ==============================================================================

# Giai đoạn 1: Build Frontend React SPA & Cài đặt Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Copy tệp định nghĩa thư viện
COPY package*.json tsconfig*.json ./

# Cài đặt tất cả phụ thuộc
RUN npm ci

# Copy toàn bộ mã nguồn
COPY . .

# Build ứng dụng React thành sản phẩm tĩnh tối ưu (dist/)
RUN npm run build

# Giai đoạn 2: Runtime Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package.json và node_modules từ giai đoạn build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src

# Cổng dịch vụ Web App + WebSocket + REST API
EXPOSE 3001

# Lệnh khởi chạy server chính thức
CMD ["npm", "start"]
