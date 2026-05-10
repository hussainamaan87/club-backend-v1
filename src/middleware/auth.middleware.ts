import jwt from "jsonwebtoken";


interface JwtPayload {

  id: string;

  roles: string[];

}
export const auth = (req: any, res: any, next: any) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token" });
  }

  try {
    const token = header.split(" ")[1];

    const data = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // 🔥 safety fallback
    req.user = {
      id: data.id,
      roles: data.roles || []
    };

    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};



export const allow = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const hasAccess = roles.some(r => req.user.roles.includes(r));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    next();
  };
};

export const optionalAuth = (
  req: any,
  res: any,
  next: any,
) => {

  try {

    const auth =
      req.headers.authorization;

    if (
      !auth ||
      !auth.startsWith("Bearer ")
    ) {
      return next();
    }

    const token =
      auth.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    );

    req.user = decoded;

    next();

  } catch (e) {

    next();
  }
};