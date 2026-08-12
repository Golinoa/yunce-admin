#!/bin/bash
# ============================================
# 服务器部署脚本
# 用途：自动化部署后端服务
# 使用：./deploy.sh
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
APP_NAME="xiaoke-api"
APP_PATH="/www/wwwroot/xiaoke-backend"
NODE_ENV="production"
LOG_FILE="/var/log/xiaoke-deploy.log"

# ============================================
# 日志函数
# ============================================
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ ${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> $LOG_FILE
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 错误: ${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> $LOG_FILE
}

log_warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  警告: ${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $1" >> $LOG_FILE
}

# ============================================
# 前置检查
# ============================================
pre_check() {
    log "🔍 执行前置检查..."

    # 检查目录是否存在
    if [ ! -d "$APP_PATH" ]; then
        log_error "应用目录不存在: $APP_PATH"
        log "正在创建目录..."
        mkdir -p $APP_PATH
    fi

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi

    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        log_warn "PM2 未安装，正在安装..."
        npm install -g pm2
    fi

    log_success "前置检查完成"
}

# ============================================
# 备份当前版本
# ============================================
backup() {
    log "📦 正在备份当前版本..."

    BACKUP_DIR="/www/wwwroot/xiaoke-backend-backup"
    BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

    mkdir -p $BACKUP_DIR

    if [ -d "$APP_PATH" ] && [ "$(ls -A $APP_PATH)" ]; then
        tar -czf "$BACKUP_DIR/backup_$BACKUP_DATE.tar.gz" -C $APP_PATH .

        # 保留最近 5 个备份
        cd $BACKUP_DIR
        ls -t backup_*.tar.gz | tail -n +6 | xargs -r rm

        log_success "备份完成: backup_$BACKUP_DATE.tar.gz"
    else
        log_warn "当前目录为空，跳过备份"
    fi
}

# ============================================
# 安装依赖
# ============================================
install_deps() {
    log "📦 安装依赖..."

    cd $APP_PATH
    npm ci --only=production --prefer-offline

    log_success "依赖安装完成"
}

# ============================================
# 数据库迁移
# ============================================
migrate_db() {
    log "🔄 执行数据库迁移..."

    cd $APP_PATH
    npx prisma migrate deploy

    log_success "数据库迁移完成"
}

# ============================================
# 重启服务
# ============================================
restart_service() {
    log "🔄 重启服务..."

    # 删除旧进程
    pm2 delete $APP_NAME 2>/dev/null || true

    # 启动新服务
    pm2 start $APP_PATH/dist/app.js \
        --name $APP_NAME \
        --max-memory-restart 500M \
        --env $NODE_ENV

    # 保存进程列表
    pm2 save

    # 设置开机自启
    pm2 startup

    log_success "服务重启完成"
}

# ============================================
# 健康检查
# ============================================
health_check() {
    log "🏥 执行健康检查..."

    MAX_RETRIES=30
    RETRY_INTERVAL=2

    for i in $(seq 1 $MAX_RETRIES); do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            log_success "健康检查通过"
            return 0
        fi
        echo -n "."
        sleep $RETRY_INTERVAL
    done

    echo ""
    log_error "健康检查失败，服务可能未正常启动"
    log "查看日志: pm2 logs $APP_NAME"
    return 1
}

# ============================================
# 部署完成
# ============================================
deploy_complete() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "🎉 部署完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 服务状态:"
    pm2 status
    echo ""
    echo "🌐 访问地址: https://api.chancore.cn"
    echo "📝 日志查看: pm2 logs $APP_NAME"
    echo "🔄 重启服务: pm2 restart $APP_NAME"
    echo "⏹️  停止服务: pm2 stop $APP_NAME"
    echo ""
}

# ============================================
# 回滚
# ============================================
rollback() {
    log "⏪ 执行回滚..."

    BACKUP_DIR="/www/wwwroot/xiaoke-backend-backup"
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup_*.tar.gz 2>/dev/null | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
        log_error "没有找到可用的备份"
        exit 1
    fi

    log "使用备份: $LATEST_BACKUP"

    # 停止服务
    pm2 stop $APP_NAME 2>/dev/null || true

    # 恢复备份
    rm -rf $APP_PATH/*
    tar -xzf $LATEST_BACKUP -C $APP_PATH

    # 重启服务
    restart_service

    log_success "回滚完成"
}

# ============================================
# 主流程
# ============================================
main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 xiaoke-api 部署脚本"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    pre_check
    backup
    install_deps
    migrate_db
    restart_service

    if health_check; then
        deploy_complete
    else
        log_error "部署可能存在问题，请检查日志"
        exit 1
    fi
}

# ============================================
# 命令行参数处理
# ============================================
case "$1" in
    rollback)
        rollback
        ;;
    status)
        pm2 status
        ;;
    logs)
        pm2 logs $APP_NAME
        ;;
    restart)
        pm2 restart $APP_NAME
        ;;
    stop)
        pm2 stop $APP_NAME
        ;;
    *)
        main
        ;;
esac
