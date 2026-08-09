#!/bin/bash
# 同步线上数据库到本地
curl -u admin:"Lion+123456？" https://duizhidian.com/api/export-db -o data/antipode.db
echo "✅ 数据库已同步到本地 data/antipode.db"