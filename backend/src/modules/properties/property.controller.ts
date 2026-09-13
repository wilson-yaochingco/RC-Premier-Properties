import type { Request, Response } from "express";
import type {
  AdminPropertyDetail,
  AdminPropertyListResponse,
  PropertyFacetsResponse,
  PropertyMapResponse,
  PropertySearchResponse,
  PublicPropertyDetail,
  RelatedPropertiesResponse,
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
  parseAdminPropertyAvailabilityBody,
  parseAdminPropertyFeaturedBody,
  parseAdminPropertyListQuery,
  parseAdminPropertyTransitionBody,
  parseCreateDraftPropertyBody,
  parsePropertyMapQuery,
  parsePropertySearchQuery,
  parsePropertySlug,
  parseUpdateDraftPropertyBody,
  parseUpdatePropertyMediaBody,
} from "./property.validation.js";
import { parseImageUploadQuery } from "./property-media.validation.js";

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

    async related(
      req: Request<{ slug: string }>,
      res: Response<RelatedPropertiesResponse>,
    ): Promise<void> {
      const slug = parsePropertySlug(req.params.slug);
      const properties = await service.related(slug);
      if (!properties) throw new HttpError(404, "Property not found.");
      res.status(200).json(properties);
    },
  };
}

export function createAdminPropertyController(
  service: AdminPropertyService = mongooseAdminPropertyService,
) {
  function mutationContext(res: Response) {
    const context = authenticatedContext(res.locals);
    if (!context) throw new HttpError(401, "Authentication required.");
    return {
      actorStaffIdentityId: context.staff.id,
      requestId: getRequestId(res),
    };
  }

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
      const property = await service.createDraft(
        parseCreateDraftPropertyBody(req.body),
        mutationContext(res),
      );
      res.status(201).json(property);
    },

    async update(
      req: Request<{ id: string }>,
      res: Response<AdminPropertyDetail>,
    ): Promise<void> {
      const property = await service.updateDraft(
        parseAdminPropertyId(req.params.id),
        parseUpdateDraftPropertyBody(req.body),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },

    async updateMedia(
      req: Request<{ id: string }>,
      res: Response<AdminPropertyDetail>,
    ): Promise<void> {
      const property = await service.updateMedia(
        parseAdminPropertyId(req.params.id),
        parseUpdatePropertyMediaBody(req.body),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },

    async uploadImage(
      req: Request<{ id: string }>,
      res: Response<AdminPropertyDetail>,
    ): Promise<void> {
      if (!service.uploadImage) {
        throw new HttpError(503, "Property image upload is not configured.");
      }
      const property = await service.uploadImage(
        parseAdminPropertyId(req.params.id),
        parseImageUploadQuery(req.query as Record<string, unknown>),
        Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
        req.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase(),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(201).json(property);
    },

    async publish(req: Request<{ id: string }>, res: Response<AdminPropertyDetail>) {
      const property = await service.publish(
        parseAdminPropertyId(req.params.id),
        parseAdminPropertyTransitionBody(req.body),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },

    async unpublish(req: Request<{ id: string }>, res: Response<AdminPropertyDetail>) {
      const property = await service.unpublish(
        parseAdminPropertyId(req.params.id),
        parseAdminPropertyTransitionBody(req.body),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },

    async archive(req: Request<{ id: string }>, res: Response<AdminPropertyDetail>) {
      const property = await service.archive(
        parseAdminPropertyId(req.params.id),
        parseAdminPropertyTransitionBody(req.body),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },

    async restore(req: Request<{ id: string }>, res: Response<AdminPropertyDetail>) {
      const property = await service.restore(
        parseAdminPropertyId(req.params.id),
        parseAdminPropertyTransitionBody(req.body),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },

    async changeAvailability(
      req: Request<{ id: string }>,
      res: Response<AdminPropertyDetail>,
    ) {
      const property = await service.changeAvailability(
        parseAdminPropertyId(req.params.id),
        parseAdminPropertyAvailabilityBody(req.body),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },

    async updateFeatured(
      req: Request<{ id: string }>,
      res: Response<AdminPropertyDetail>,
    ) {
      const property = await service.updateFeatured(
        parseAdminPropertyId(req.params.id),
        parseAdminPropertyFeaturedBody(req.body),
        mutationContext(res),
      );
      if (!property) throw new HttpError(404, "Property not found.");
      res.status(200).json(property);
    },
  };
}
