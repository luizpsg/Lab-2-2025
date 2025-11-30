import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/task_provider.dart';
import 'screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final baseScheme = ColorScheme.fromSeed(
      brightness: Brightness.dark,
      seedColor: Colors.tealAccent,
    );

    final colorScheme = baseScheme.copyWith(
      background: const Color(0xFF0B0F16),
      surface: const Color(0xFF151A24),
      primary: Colors.tealAccent,
      secondary: const Color(0xFF7C4DFF),
    );

    final textTheme = ThemeData.dark().textTheme.apply(
          bodyColor: Colors.grey[100],
          displayColor: Colors.grey[100],
        );

    return ChangeNotifierProvider(
      create: (_) => TaskProvider()..initialize(),
      child: MaterialApp(
        title: 'Task Manager Offline-First',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: colorScheme,
          useMaterial3: true,
          scaffoldBackgroundColor: colorScheme.background,
          textTheme: textTheme,
          appBarTheme: AppBarTheme(
            backgroundColor: Colors.transparent,
            elevation: 0,
            titleTextStyle: textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
            ),
          ),
          snackBarTheme: SnackBarThemeData(
            backgroundColor: colorScheme.surface,
            contentTextStyle: textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurface,
            ),
          ),
          cardTheme: CardThemeData(
            color: colorScheme.surface,
            elevation: 4,
            margin: EdgeInsets.zero,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            shadowColor: Colors.black.withOpacity(0.4),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: colorScheme.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.white10),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.white10),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: colorScheme.primary),
            ),
          ),
          floatingActionButtonTheme: FloatingActionButtonThemeData(
            backgroundColor: colorScheme.primary,
            foregroundColor: Colors.black,
          ),
          listTileTheme: ListTileThemeData(
            iconColor: colorScheme.primary,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12),
          ),
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
