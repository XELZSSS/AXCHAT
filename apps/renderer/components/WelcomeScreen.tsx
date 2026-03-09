import React from 'react';
interface WelcomeScreenProps {
  input?: React.ReactNode;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ input }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[60vh]">
      {input ? <div className="w-full max-w-[min(52rem,100%)]">{input}</div> : null}
    </div>
  );
};

const MemoizedWelcomeScreen = React.memo(WelcomeScreen);
export default MemoizedWelcomeScreen;
