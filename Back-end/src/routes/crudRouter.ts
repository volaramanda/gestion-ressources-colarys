// backend/src/routes/crudRouter.ts
import { Router, RequestHandler } from "express";
import { withVersionHeader } from "../middleware/withVersionHeader";

interface BaseController {
  getAll: RequestHandler;
  getOne: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
}

export function createCrudRouter(
  controller: BaseController,
  entity: any,
  basePath = "",
  middlewares: RequestHandler[] = []
) {
  const router = Router();

  router.get(`${basePath}/getAll`, withVersionHeader(entity), ...middlewares, controller.getAll);
  router.get(`${basePath}/getOne/:id`, withVersionHeader(entity), ...middlewares, controller.getOne);
  router.post(`${basePath}/create`, ...middlewares, controller.create);
  router.put(`${basePath}/update/:id`, ...middlewares, controller.update);
  router.delete(`${basePath}/delete/:id`, ...middlewares, controller.delete);

  return router;
}

// // src/routes/crudRouter.ts
// import { Router, RequestHandler } from "express";

// interface BaseController {
//   getAll: RequestHandler;
//   getOne: RequestHandler;
//   create: RequestHandler;
//   update: RequestHandler;
//   delete: RequestHandler;
// }

// export function createCrudRouter(
//   controller: BaseController,
//   basePath = "",
//   middlewares: RequestHandler[] = []
// ) {
//   const router = Router();

//   router.get(`${basePath}/getAll`, ...middlewares, controller.getAll);
//   router.get(`${basePath}/getOne/:id`, ...middlewares, controller.getOne);
//   router.post(`${basePath}/create`, ...middlewares, controller.create);
//   router.put(`${basePath}/update/:id`, ...middlewares, controller.update);
//   router.delete(`${basePath}/delete/:id`, ...middlewares, controller.delete);

//   return router;
// }

// src/routes/crudRouter.ts
