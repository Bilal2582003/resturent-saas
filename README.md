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