declare module "*.css";

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "admin" | "teacher" | "student" | "parent";
    };
  }
}

export {};