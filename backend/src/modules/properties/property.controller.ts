import type { Request, Response } from "express";
import type {
  PropertyFacetsResponse,
  PropertyMapResponse,
  PropertySearchResponse,
  PublicPropertyDetail,
} from "@rc/shared";
import { HttpError } from "../../middleware/errorHandler.js";
import { mongoosePropertyService } from "./property.service.js";
import type { PropertyService } from "./property.types.js";
import {
  parsePropertyMapQuery,
  parsePropertySearchQuery,
  parsePropertySlug,
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
