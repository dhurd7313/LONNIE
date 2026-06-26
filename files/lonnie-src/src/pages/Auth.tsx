import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
export default function Auth() {
  const nav = useNavigate();
  useEffect(() => { nav("/", { replace: true }); }, [nav]);
  return null;
}
