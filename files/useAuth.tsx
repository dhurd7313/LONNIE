import React, { createContext, useContext } from "react";
const Ctx = createContext({ user: null as null, isLoading: false });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ user: null, isLoading: false }}>{children}</Ctx.Provider>;
}
export function useAuth() { return useContext(Ctx); }
