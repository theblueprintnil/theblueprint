@echo off
cd /d "c:\Users\S Roe\Projects\The Blueprint - NIL Athlete Promotion Site\web"
npx prisma db push --force-reset --skip-generate > "%~dp0db-setup-out.txt" 2>&1
npm run db:rls >> "%~dp0db-setup-out.txt" 2>&1
npx prisma db seed >> "%~dp0db-setup-out.txt" 2>&1
echo COMPLETE >> "%~dp0db-setup-out.txt"
