import { memo } from 'react';
import type { ReactNode } from 'react';
interface WelcomeScreenProps {
  input?: ReactNode;
}

const WelcomeScreen = ({ input }: WelcomeScreenProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[60vh]">
      {input && <div className="w-full max-w-[min(52rem,100%)]">{input}</div>}
    </div>
  );
};

const MemoizedWelcomeScreen = memo(WelcomeScreen);
export default MemoizedWelcomeScreen;
