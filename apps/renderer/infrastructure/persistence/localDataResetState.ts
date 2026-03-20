let resettingLocalData = false;

export const beginLocalDataReset = (): void => {
  resettingLocalData = true;
};

export const endLocalDataReset = (): void => {
  resettingLocalData = false;
};

export const isLocalDataResetInProgress = (): boolean => resettingLocalData;
