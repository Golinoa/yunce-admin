#!/bin/bash
# ============================================
# SSL 证书自动管理脚本
# 用途：自动申请、续期 SSL 证书
# 使用：
#   ./ssl-manage.sh issue    - 申请新证书
#   ./ssl-manage.sh renew    - 续期证书
#   ./ssl-manage.sh status   - 查看证书状态
#   ./ssl-manage.sh install  - 安装证书到 Nginx
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
DOMAIN="api.chancore.cn"
EMAIL="你的邮箱@chancore.cn"  # 修改为你的邮箱
SSL_DIR="/www/server/nginx/ssl"
WEB_ROOT="/www/wwwroot/xiaoke-backend"
AUTO_RENEW_DAYS=60  # 证书过期前多少天自动续期

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ ${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 错误: ${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  警告: ${NC} $1"
}

# ============================================
# 检查依赖
# ============================================
check_deps() {
    log "🔍 检查依赖..."

    if ! command -v curl &> /dev/null; then
        log_error "curl 未安装"
        exit 1
    fi

    if ! command -v socat &> /dev/null; then
        log_warn "socat 未安装，acme.sh 可能无法自动续期"
        log "安装: apt install socat 或 yum install socat"
    fi

    # 检查 acme.sh
    if [ ! -d "$HOME/.acme.sh" ]; then
        log "📦 安装 acme.sh..."
        curl https://get.acme.sh | sh -s email=$EMAIL
    fi

    log_success "依赖检查完成"
}

# ============================================
# 申请证书
# ============================================
issue_cert() {
    log "🔐 申请 SSL 证书: $DOMAIN"

    mkdir -p $SSL_DIR

    # 使用 Standalone 模式（需要 80 端口空闲）
    ~/.acme.sh/acme.sh --issue -d $DOMAIN --webroot $WEB_ROOT --force

    if [ $? -eq 0 ]; then
        log_success "证书申请成功"
        install_cert
    else
        log_error "证书申请失败"
        exit 1
    fi
}

# ============================================
# 安装证书
# ============================================
install_cert() {
    log "📥 安装证书到 Nginx..."

    ~/.acme.sh/acme.sh --install-cert -d $DOMAIN \
        --key-file $SSL_DIR/$DOMAIN.key \
        --fullchain-file $SSL_DIR/$DOMAIN.crt \
        --reloadcmd "chmod 644 $SSL_DIR/$DOMAIN.crt && chmod 644 $SSL_DIR/$DOMAIN.key && /etc/init.d/nginx reload"

    log_success "证书安装完成"
}

# ============================================
# 续期证书
# ============================================
renew_cert() {
    log "🔄 续期 SSL 证书..."

    ~/.acme.sh/acme.sh --renew -d $DOMAIN --force

    if [ $? -eq 0 ]; then
        install_cert
        log_success "证书续期成功"
    else
        log_error "证书续期失败"
        exit 1
    fi
}

# ============================================
# 查看证书状态
# ============================================
show_status() {
    log "📋 SSL 证书状态"

    CERT_FILE="$SSL_DIR/$DOMAIN.crt"

    if [ ! -f "$CERT_FILE" ]; then
        log_warn "证书文件不存在"
        echo ""
        echo "请先申请证书: ./ssl-manage.sh issue"
        return
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "证书信息:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 证书主题
    echo -n "域名: "
    openssl x509 -in $CERT_FILE -noout -subject 2>/dev/null | sed 's/subject=//'

    # 颁发者
    echo -n "颁发者: "
    openssl x509 -in $CERT_FILE -noout -issuer 2>/dev/null | sed 's/issuer=//'

    # 有效期
    echo -n "有效期至: "
    openssl x509 -in $CERT_FILE -noout -enddate 2>/dev/null | sed 's/notAfter=//'

    # 剩余天数
    EXPIRE_DATE=$(openssl x509 -in $CERT_FILE -noout -enddate 2>/dev/null | cut -d= -f2)
    EXPIRE_SECONDS=$(date -d "$EXPIRE_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRE_DATE" +%s 2>/dev/null)
    NOW_SECONDS=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRE_SECONDS - $NOW_SECONDS) / 86400 ))

    echo ""
    if [ $DAYS_LEFT -lt 30 ]; then
        echo -e "剩余天数: ${RED}$DAYS_LEFT 天${NC} ⚠️  建议尽快续期"
    elif [ $DAYS_LEFT -lt $AUTO_RENEW_DAYS ]; then
        echo -e "剩余天数: ${YELLOW}$DAYS_LEFT 天${NC}"
    else
        echo -e "剩余天数: ${GREEN}$DAYS_LEFT 天${NC}"
    fi

    echo ""
    echo "证书文件: $CERT_FILE"
    echo "密钥文件: $SSL_DIR/$DOMAIN.key"

    # acme.sh 信息
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "acme.sh 证书信息:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    ~/.acme.sh/acme.sh --list 2>/dev/null || echo "无 acme.sh 证书记录"

    echo ""
}

# ============================================
# 自动续期检查（由 cron 调用）
# ============================================
auto_renew() {
    CERT_FILE="$SSL_DIR/$DOMAIN.crt"

    if [ ! -f "$CERT_FILE" ]; then
        log_warn "证书不存在，跳过续期检查"
        return
    fi

    # 获取剩余天数
    EXPIRE_DATE=$(openssl x509 -in $CERT_FILE -noout -enddate 2>/dev/null | cut -d= -f2)
    EXPIRE_SECONDS=$(date -d "$EXPIRE_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRE_DATE" +%s 2>/dev/null)
    NOW_SECONDS=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRE_SECONDS - $NOW_SECONDS) / 86400 ))

    if [ $DAYS_LEFT -lt $AUTO_RENEW_DAYS ]; then
        log "证书将在 $DAYS_LEFT 天后过期，自动续期..."
        renew_cert
    else
        log "证书状态正常，剩余 $DAYS_LEFT 天"
    fi
}

# ============================================
# 设置定时任务
# ============================================
setup_cron() {
    log "⏰ 设置自动续期定时任务..."

    # 每天凌晨 3 点检查一次
    CRON_JOB="0 3 * * * $HOME/.acme.sh/ssl-manage.sh auto-renew >> /var/log/ssl-renew.log 2>&1"

    (crontab -l 2>/dev/null | grep -v "ssl-manage.sh"; echo "$CRON_JOB") | crontab -

    log_success "定时任务设置完成"
    echo ""
    echo "当前定时任务:"
    crontab -l 2>/dev/null | grep ssl || echo "无 SSL 相关定时任务"
}

# ============================================
# 帮助信息
# ============================================
show_help() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "SSL 证书管理脚本"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "用法: ./ssl-manage.sh <命令>"
    echo ""
    echo "命令:"
    echo "  issue       申请新证书"
    echo "  install     安装证书到 Nginx"
    echo "  renew       手动续期证书"
    echo "  status      查看证书状态"
    echo "  cron        设置自动续期定时任务"
    echo "  auto-renew  自动续期检查（由 cron 调用）"
    echo "  help        显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./ssl-manage.sh status     # 查看证书状态"
    echo "  ./ssl-manage.sh renew      # 手动续期"
    echo "  ./ssl-manage.sh cron       # 设置每日自动检查"
    echo ""
}
