import 'package:flutter/material.dart';

class Category {
  final String id;
  final String name;
  final String icon;
  final Color color;

  const Category({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
  });

  Map<String, dynamic> toMap() {
    return {'id': id, 'name': name, 'icon': icon, 'color': color.value};
  }

  factory Category.fromMap(Map<String, dynamic> map) {
    return Category(
      id: map['id'],
      name: map['name'],
      icon: map['icon'],
      color: Color(map['color']),
    );
  }
}

// Categorias predefinidas
class Categories {
  static const work = Category(
    id: 'work',
    name: 'Trabalho',
    icon: 'work',
    color: Color(0xFF2196F3), // Azul
  );

  static const personal = Category(
    id: 'personal',
    name: 'Pessoal',
    icon: 'person',
    color: Color(0xFF4CAF50), // Verde
  );

  static const study = Category(
    id: 'study',
    name: 'Estudos',
    icon: 'school',
    color: Color(0xFF9C27B0), // Roxo
  );

  static const health = Category(
    id: 'health',
    name: 'Saúde',
    icon: 'favorite',
    color: Color(0xFFE91E63), // Rosa
  );

  static const shopping = Category(
    id: 'shopping',
    name: 'Compras',
    icon: 'shopping_cart',
    color: Color(0xFFFF9800), // Laranja
  );

  static const finance = Category(
    id: 'finance',
    name: 'Finanças',
    icon: 'attach_money',
    color: Color(0xFF4CAF50), // Verde escuro
  );

  static const home = Category(
    id: 'home',
    name: 'Casa',
    icon: 'home',
    color: Color(0xFF795548), // Marrom
  );

  static const other = Category(
    id: 'other',
    name: 'Outros',
    icon: 'more_horiz',
    color: Color(0xFF607D8B), // Cinza azulado
  );

  static const List<Category> all = [
    work,
    personal,
    study,
    health,
    shopping,
    finance,
    home,
    other,
  ];

  static Category getById(String id) {
    return all.firstWhere((cat) => cat.id == id, orElse: () => other);
  }

  static IconData getIconData(String iconName) {
    switch (iconName) {
      case 'work':
        return Icons.work;
      case 'person':
        return Icons.person;
      case 'school':
        return Icons.school;
      case 'favorite':
        return Icons.favorite;
      case 'shopping_cart':
        return Icons.shopping_cart;
      case 'attach_money':
        return Icons.attach_money;
      case 'home':
        return Icons.home;
      case 'more_horiz':
      default:
        return Icons.more_horiz;
    }
  }
}
