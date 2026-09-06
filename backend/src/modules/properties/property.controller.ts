import type { Request, Response } from "express";
import type {
  AdminPropertyDetail,
  AdminPropertyListResponse,
  PropertyFacetsResponse,
  PropertyMapResponse,
  PropertySearchResponse,
  PublicPropertyDetail,
} from "@rc/shared";
import { HttpError } from "../../middleware/errorHandler.js";
import { getRequestId } from "../../middleware/requestContext.js";
import { authenticatedContext } from "../auth/auth.middleware.js";
import {
  mongooseAdminPropertyService,
  mongoosePropertyService,
} from "./property.service.js";
import type { AdminPropertyService, PropertyService } from "./property.types.js";
import {
  parseAdminPropertyId,
  parseAdminPropertyListQuery,
  parseCreateDraftPropertyBody,
  parsePropertyMapQuery,
  parsePropertySearchQuery,
  parsePropertySlug,
  parseUpdateDraftPropertyBody,
} from "./property.validation.js";

export function createPropertyController(
  service: PropertyService = mongoosePropertyService,
) {
  return {
    async search(req: Request, res: Response<PropertySearchResponse>): Promise<void> {
      const request = parsePropertySearchQuery(req.query);
      res.status(200).json(await service.search(request));
    },

    async facets(_req: Request, res: Response<PropertyFacetsResponse>): Promise<void> {
      res.status(200).json(await service.getFacets());
    },

    async map(req: Request, res: Response<PropertyMapResponse>): Promise<void> {
      const request = parsePropertyMapQuery(req.query);
      res.status(200).json(await service.map(request));
    },

    async detail(
      req: Request<{ slug: string }>,
      res: Response<PublicPropertyDetail>,
    ): Promise<void> {
      const slug = parsePropertySlug(req.params.slug);
      const property = await service.findPublishedBySlug(slug);
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },
  };
}

export function createAdminPropertyController(
  service: AdminPropertyService = mongooseAdminPropertyService,
) {
  return {
    async list(_req: Request, res: Response<AdminPropertyListResponse>): Promise<void> {
      res
        .status(200)
        .json(await service.listPrivate(parseAdminPropertyListQuery(_req.query)));
    },

    async detail(
      req: Request<{ id: string }>,
      res: Response<AdminPropertyDetail>,
    ): Promise<void> {
      const property = await service.findPrivateById(
        parseAdminPropertyId(req.params.id),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },

    async create(req: Request, res: Response<AdminPropertyDetail>): Promise<void> {
      const context = authenticatedContext(res.locals);
      if (!context) throw new HttpError(401, "Authentication required.");
      const property = await service.createDraft(
        parseCreateDraftPropertyBody(req.body),
        {
          actorStaffIdentityId: context.staff.id,
          requestId: getRequestId(res),
        },
      );
      res.status(201).json(property);
    },

    async update(
      req: Request<{ id: string }>,
      res: Response<AdminPropertyDetail>,
    ): Promise<void> {
      const context = authenticatedContext(res.locals);
      if (!context) throw new HttpError(401, "Authentication required.");
      const property = await service.updateDraft(
        parseAdminPropertyId(req.params.id),
        parseUpdateDraftPropertyBody(req.body),
        {
          actorStaffIdentityId: context.staff.id,
          requestId: getRequestId(res),
        },
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },
  };
}
