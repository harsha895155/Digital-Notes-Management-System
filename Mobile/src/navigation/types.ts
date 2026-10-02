import { NavigatorScreenParams } from '@react-navigation/native';
import { Note } from '../types';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  NoteDetail: { note: Note };
  Categories: undefined;
  ChangePassword: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  NotesTab: undefined;
  CalendarTab: undefined;
  TasksTab: undefined;
  ProfileTab: undefined;
};
