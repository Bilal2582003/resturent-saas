src/
├── config/
│   ├── db.js
│   └── env.js
├── middleware/
│   ├── auth.js          (requireAuth, requireRole)
│   ├── tenant.js        (resolve restaurant from slug)
│   └── upload.js        (multer config)
├── repositories/
│   ├── restaurant.repo.js
│   ├── category.repo.js
│   ├── item.repo.js
│   └── order.repo.js
├── services/
│   ├── auth.service.js
│   ├── menu.service.js
│   ├── order.service.js
│   └── image.service.js
├── controllers/
│   ├── auth.controller.js
│   ├── superadmin.controller.js
│   ├── dashboard.controller.js
│   └── menu.controller.js
├── routes/
│   ├── auth.routes.js
│   ├── superadmin.routes.js
│   ├── dashboard.routes.js
│   └── menu.routes.js
└── server.js

views/
├── layouts/main.ejs
├── auth/login.ejs
├── superadmin/restaurants.ejs
├── dashboard/{index,menu,orders,appearance}.ejs
├── menu/{index,item-modal.ejs}
└── partials/{header,footer,flash}.ejs

public/{css,js,uploads}
migrations/
seeds/

======= For run project  =======
# 1) Create DB
createdb qr_menu

# 2) Migrate
psql $DATABASE_URL -f migrations/001_init.sql
# or on Windows:
# psql -U postgres -d qr_menu -f migrations/001_init.sql

# 3) Seed
node seeds/seed.js

# 4) Run dev
npm run dev

===== Credentials =====

Super admin: super@qr.com / admin123
Restaurant admin: admin@bbq.com / admin123



