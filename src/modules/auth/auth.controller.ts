import { Request, Response } from "express";
import * as service from "./auth.service";

export const sendOtp = (req: Request, res: Response) =>
  service.sendOtp(req, res);

export const verifyOtp = (req: Request, res: Response) =>
  service.verifyOtp(req, res);

export const getMe = (req: any, res: Response) =>
  service.getMe(req, res);

export const updateProfile = (req: any, res: Response) =>
  service.updateProfile(req, res);

export const updateProfileImage = service.updateProfileImage;