# Fair Scanner

A production-ready React Native app for the Zebra MC2200 Android device, designed for trade fairs to scan EAN barcodes, build orders, and export CSV files with email delivery.

## Features

- **Barcode Scanning**: EAN-13/EAN-8 support via Zebra DataWedge
- **Offline-First**: SQLite local storage with offline order management
- **Order Management**: Create, edit, and finalize orders with customer details
- **Product Cache**: Local product database with intelligent Supabase sync (timestamp-based updates)
- **Pricing**: All prices are ex-VAT for simplified calculations
- **CSV Export**: Automatic CSV generation and email delivery
- **Touch-Friendly UI**: Optimized for mobile device use at trade fairs

## Tech Stack

- **Frontend**: React Native (Expo + Dev Client), TypeScript
- **Database**: Supabase (PostgreSQL + RLS), SQLite (local)
- **State Management**: Zustand
- **Barcode**: Zebra DataWedge integration
- **Storage**: Supabase Storage for CSV exports
- **Email**: Edge Function with email delivery (Resend placeholder)

## Prerequisites

- Node.js 18+ and npm
- Android Studio (for Android development)
- Zebra MC2200 device or Android emulator
- Supabase account and project

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd fair-scanner
chmod +x scripts/dev-bootstrap.sh
./scripts/dev-bootstrap.sh
```

### 2. Environment Configuration

Copy the environment template and fill in your values:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Configuration
ORDERS_FALLBACK_TO=your_email@example.com
ORDERS_CC=optional_cc@example.com

# App Configuration
FAIR_NAME=Myplant 2025
```

### 3. Supabase Setup

#### Database Schema

Run the SQL files in your Supabase project:

1. **Schema**: `supabase/schema.sql`
2. **RLS Policies**: `supabase/rls.sql`
3. **Sample Data**: `supabase/seed.sql`

Or use the Supabase CLI:

```bash
supabase db reset
supabase db push
```

#### Edge Functions

Deploy the edge function:

```bash
supabase functions deploy finalize-order
```

#### Storage Bucket

The schema automatically creates an `exports` bucket for CSV files.

### 4. Seed Sample Products

```bash
npm run seed
```

### 5. Run the App

```bash
npx expo run:android
```

## Zebra DataWedge Setup

### Overview

DataWedge is Zebra's barcode scanning solution. The app is configured to receive keystroke output from DataWedge.

### Step-by-Step Setup

1. **Open DataWedge** on your MC2200
2. **Create Profile**: Tap `+` → Name: `FairScanner`
3. **Associate App**: Set to `com.fairscanner.app`
4. **Barcode Input**: Enable with EAN-13/EAN-8 symbologies
5. **Keystroke Output**: Enable with "Send Enter Key After Data"

### Detailed Instructions

See [DataWedge-Profile.md](android-notes/DataWedge-Profile.md) for comprehensive setup instructions, troubleshooting, and advanced configuration options.

### Testing

1. Open the Fair Scanner app
2. Navigate to Scan screen
3. Scan any EAN barcode
4. Verify haptic feedback and product display

## App Usage

### 1. New Order

- Enter customer name (required)
- Add email and sales rep (optional)
- Tap "Start scanning"

### 2. Scan Products

- **Automatic**: Scan EAN barcodes to add products
- **Manual**: Tap "Legg til manuelt" for unknown products
- **Quantity**: Use +/- buttons to adjust quantities
- **Remove**: Tap × button to remove items

### 3. Review & Finalize

- Review order items and totals
- Add optional notes
- Tap "Fullfør og send" to finalize
- CSV is generated and emailed automatically

### 4. Order Management

- View all orders (draft, finalized, sync errors)
- Sync offline orders when network is available
- Access order history and status

## Development

### Project Structure

```
/
├── app/                    # React Native app
│   ├── components/        # Reusable UI components
│   ├── screens/          # App screens
│   ├── state/            # Zustand stores
│   └── lib/              # Utilities and services
├── edge/                  # Supabase Edge Functions
├── supabase/             # Database schema and policies
├── android-notes/        # Zebra setup documentation
└── scripts/              # Development and deployment scripts
```

### Key Components

- **HiddenScannerInput**: Receives DataWedge keystrokes
- **LineRow**: Displays order items with quantity controls
- **Totals**: Shows order totals with VAT calculations
- **OrderStore**: Manages order state and synchronization

### Database Schema

- **products**: Product catalog with EAN lookup
- **customers**: Customer information
- **orders**: Order headers and metadata
- **order_items**: Individual order line items

### Offline Strategy

1. **Local Storage**: SQLite for orders and product cache
2. **Sync Queue**: Draft orders stored locally until network available
3. **Conflict Resolution**: Last-write-wins with timestamps
4. **Error Handling**: Failed syncs marked for retry

## Building for Production

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g @eas/cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android
```

### Manual Build

```bash
# Prebuild
npx expo prebuild

# Build APK
cd android
./gradlew assembleRelease
```

### Signing

For production releases, you'll need to configure Android signing:

1. Generate keystore
2. Configure `android/app/build.gradle`
3. Set environment variables for signing

## Troubleshooting

### Common Issues

#### Scanner Not Working

1. **Check DataWedge Profile**: Ensure profile is associated with app
2. **Verify Permissions**: App needs VIBRATE permission
3. **Test Scanner**: Try scanning in text editor first
4. **Reboot Device**: Sometimes needed after DataWedge changes

#### App Crashes

1. **Check Logs**: Use `adb logcat` for Android
2. **Clear Cache**: Uninstall and reinstall app
3. **Verify Environment**: Check `.env` configuration
4. **Database Issues**: Clear app data if SQLite errors occur

#### Sync Problems

1. **Network**: Check internet connectivity
2. **Supabase**: Verify project URL and keys
3. **Edge Function**: Check function deployment status
4. **Permissions**: Ensure RLS policies are correct

#### Build Issues

1. **Dependencies**: Run `npm install` and clear cache
2. **Expo**: Update to latest Expo SDK
3. **Android**: Check Android SDK and build tools
4. **Memory**: Increase Node.js memory limit if needed

### Debug Mode

Enable debug logging:

```typescript
// In app/lib/supabase.ts
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseAnonKey)

// In app/lib/productsCache.ts
console.log('Syncing products...')
```

### Performance Tips

1. **Product Cache**: Limit local product database size
2. **Image Optimization**: Use appropriate image formats and sizes
3. **Bundle Size**: Monitor app bundle size with `expo build:analyze`
4. **Memory Management**: Implement proper cleanup in useEffect

### Product Cache Optimization

The app uses an intelligent product synchronization system to minimize data transfer and improve performance:

- **Timestamp-based Updates**: Only products modified since last sync are downloaded
- **Local Caching**: Products are stored locally in SQLite for offline access
- **Smart Sync**: Automatic sync every hour, or when searching for missing products
- **Efficient Queries**: Uses `updated_at` field to fetch only changed products

This approach scales efficiently from 11 mock products to 10,000+ real products without performance degradation.

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Public anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Yes |
| `ORDERS_FALLBACK_TO` | Default email recipient | Yes |
| `ORDERS_CC` | CC email address | No |
| `FAIR_NAME` | Default fair name | No |

### Supabase Settings

- **RLS**: Enabled on all tables
- **Policies**: Public read, service role write
- **Storage**: Private bucket with signed URLs
- **Edge Functions**: Service role authentication

### App Configuration

- **Package Name**: `com.fairscanner.app`
- **Minimum SDK**: Android 6.0 (API 23)
- **Target SDK**: Android 13 (API 33)
- **Permissions**: VIBRATE, INTERNET, ACCESS_NETWORK_STATE

## Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** feature branch
3. **Implement** changes with tests
4. **Submit** pull request

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React Native
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=orderStore
```

## Support

### Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Zebra DataWedge Documentation](https://developer.zebra.com/wikis/datawedge)

### Community

- [Expo Discord](https://chat.expo.dev/)
- [React Native Community](https://github.com/react-native-community)
- [Supabase Discord](https://discord.supabase.com/)

### Issues

For bugs and feature requests:

1. Check existing issues
2. Create new issue with detailed description
3. Include device model and OS version
4. Provide error logs and steps to reproduce

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Expo Team** for the excellent development platform
- **Supabase** for the powerful backend services
- **Zebra Technologies** for the MC2200 device
- **React Native Community** for the mobile framework

---

**Note**: This app is designed specifically for trade fair use with Zebra MC2200 devices. Ensure proper testing on target hardware before production deployment.
