import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface UserContextType {
  nickname: string;
  color: string;
  isHost: boolean;
  setUserInfo: (nickname: string, color: string, isHost: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("#209cee");
  const [isHost, setIsHost] = useState(true);

  const setUserInfo = (
    newNickname: string,
    newColor: string,
    newIsHost: boolean
  ) => {
    setNickname(newNickname);
    setColor(newColor);
    setIsHost(newIsHost);
  };

  return (
    <UserContext.Provider value={{ nickname, color, isHost, setUserInfo }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
