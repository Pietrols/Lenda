import { Request, Response } from "express";
import * as AuthService from "../services/auth.service";

export async function register(req: Request, res: Response): Promise<void> {
  const result = await AuthService.register(req.body);
  res.status(201).json(result);
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const result = await AuthService.verifyEmail(req.body);
  res.json(result);
}

export async function resendEmailOtp(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await AuthService.resendEmailOtp(req.body.email);
  res.json(result);
}

export async function sendPhoneOtp(req: Request, res: Response): Promise<void> {
  const result = await AuthService.sendPhoneOtp(req.body.phone);
  res.json(result);
}

export async function verifyPhone(req: Request, res: Response): Promise<void> {
  const result = await AuthService.verifyPhone(req.body);
  res.json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await AuthService.login(req.body);
  res.json(result);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const result = await AuthService.refreshTokens(req.body.refreshToken);
  res.json(result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.body?.refreshToken as string | undefined;
  const result = await AuthService.logout(
    req.user!.sub,
    req.user!.jti,
    refreshToken,
  );
  res.json(result);
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await AuthService.getMe(req.user!.sub);
  res.json(user);
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await AuthService.forgotPassword(req.body.email);
  res.json(result);
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await AuthService.resetPassword(
    req.body.email,
    req.body.otp,
    req.body.newPassword,
  );
  res.json(result);
}
