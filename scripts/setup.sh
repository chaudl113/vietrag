#!/bin/bash
# ============================================
# VietRAG - Script cài đặt tự động
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}🇻🇳 VietRAG - Hệ thống RAG tiếng Việt${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

# ---- Kiểm tra yêu cầu hệ thống ----
check_prerequisites() {
    echo -e "${BLUE}[1/5] Kiểm tra yêu cầu hệ thống...${NC}"

    # Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
        print_success "Docker đã cài đặt: v${DOCKER_VERSION}"
    else
        print_error "Docker chưa cài đặt!"
        echo "   Cài đặt tại: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Docker Compose
    if docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
        print_success "Docker Compose đã cài đặt: v${COMPOSE_VERSION}"
    elif command -v docker-compose &> /dev/null; then
        print_warning "Sử dụng docker-compose cũ, khuyến nghị nâng cấp Docker Compose v2+"
    else
        print_error "Docker Compose chưa cài đặt!"
        echo "   Cài đặt tại: https://docs.docker.com/compose/install/"
        exit 1
    fi

    # Node.js (optional for dev mode)
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js đã cài đặt: ${NODE_VERSION}"
    else
        print_warning "Node.js chưa cài đặt (cần cho dev mode)"
        echo "   Cài đặt tại: https://nodejs.org/"
    fi

    # Kiểm tra RAM
    if [[ "$OSTYPE" == "darwin"* ]]; then
        TOTAL_RAM_GB=$(( $(sysctl -n hw.memsize) / 1073741824 ))
    else
        TOTAL_RAM_GB=$(( $(grep MemTotal /proc/meminfo | awk '{print $2}') / 1048576 ))
    fi

    if [ "$TOTAL_RAM_GB" -lt 4 ]; then
        print_warning "RAM thấp: ${TOTAL_RAM_GB}GB (khuyến nghị 8GB+)"
    else
        print_success "RAM: ${TOTAL_RAM_GB}GB"
    fi

    echo ""
}

# ---- Cấu hình .env ----
setup_env() {
    echo -e "${BLUE}[2/5] Cấu hình biến môi trường...${NC}"

    if [ -f .env ]; then
        print_success "File .env đã tồn tại"
    else
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Đã tạo .env từ .env.example"
            print_warning "Vui lòng chỉnh sửa .env và điền OPENAI_API_KEY!"
        else
            print_error "Không tìm thấy .env.example"
            exit 1
        fi
    fi

    # Kiểm tra OPENAI_API_KEY
    if grep -q "sk-your-api-key-here" .env 2>/dev/null; then
        echo ""
        print_warning "⚠ OPENAI_API_KEY chưa được cấu hình!"
        echo -e "   Chỉnh sửa file ${YELLOW}.env${NC} và điền API key trước khi sử dụng."
        echo ""
    fi

    echo ""
}

# ---- Khởi động Docker ----
start_services() {
    echo -e "${BLUE}[3/5] Khởi động dịch vụ hạ tầng...${NC}"

    if [ -f docker-compose.dev.yml ]; then
        print_info "Sử dụng docker-compose.dev.yml (chỉ hạ tầng)"
        docker compose -f docker-compose.dev.yml up -d
    else
        docker compose up -d
    fi

    echo ""
}

# ---- Chờ dịch vụ sẵn sàng ----
wait_for_services() {
    echo -e "${BLUE}[4/5] Chờ dịch vụ khởi động...${NC}"

    # Elasticsearch
    print_info "Đang chờ Elasticsearch..."
    for i in $(seq 1 60); do
        if curl -sf http://localhost:9200/_cluster/health > /dev/null 2>&1; then
            print_success "Elasticsearch sẵn sàng"
            break
        fi
        if [ $i -eq 60 ]; then
            print_error "Elasticsearch không phản hồi sau 60 giây"
            echo "   Kiểm tra: docker logs vietrag-es"
        fi
        sleep 1
    done

    # MySQL
    print_info "Đang chờ MySQL..."
    for i in $(seq 1 60); do
        if docker exec vietrag-mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD:-vietrag_password}" 2>/dev/null | grep -q "alive"; then
            print_success "MySQL sẵn sàng"
            break
        fi
        if [ $i -eq 60 ]; then
            print_error "MySQL không phản hồi sau 60 giây"
            echo "   Kiểm tra: docker logs vietrag-mysql"
        fi
        sleep 1
    done

    # Redis
    print_info "Đang chờ Redis..."
    for i in $(seq 1 30); do
        if docker exec vietrag-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
            print_success "Redis sẵn sàng"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Redis không phản hồi sau 30 giây"
        fi
        sleep 1
    done

    # MinIO
    print_info "Đang chờ MinIO..."
    for i in $(seq 1 30); do
        if curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; then
            print_success "MinIO sẵn sàng"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "MinIO không phản hồi sau 30 giây"
        fi
        sleep 1
    done

    echo ""
}

# ---- Thông báo hoàn tất ----
print_summary() {
    echo -e "${BLUE}[5/5] Hoàn tất cài đặt!${NC}"
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ VietRAG đã sẵn sàng!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  📡 Dịch vụ hạ tầng:"
    echo -e "     Elasticsearch : ${YELLOW}http://localhost:9200${NC}"
    echo -e "     MySQL         : ${YELLOW}localhost:3306${NC}"
    echo -e "     Redis         : ${YELLOW}localhost:6379${NC}"
    echo -e "     MinIO Console : ${YELLOW}http://localhost:9001${NC}"
    echo ""
    echo -e "  🚀 Tiếp theo (chạy dev mode):"
    echo -e "     ${BLUE}# Terminal 1 - Backend${NC}"
    echo -e "     cd backend && npm install && npm run dev"
    echo -e ""
    echo -e "     ${BLUE}# Terminal 2 - Frontend${NC}"
    echo -e "     cd frontend && npm install && npm run dev"
    echo -e ""
    echo -e "  🌐 Mở trình duyệt: ${YELLOW}http://localhost:3000${NC}"
    echo ""
    echo -e "  📖 Docs: ${YELLOW}docs/ARCHITECTURE.md${NC}"
    echo -e "  🐛 Issues: ${YELLOW}https://github.com/chaudl113/vietrag/issues${NC}"
    echo ""
}

# ---- Main ----
print_header
check_prerequisites
setup_env
start_services
wait_for_services
print_summary
