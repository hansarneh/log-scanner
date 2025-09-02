# DataWedge Setup for Fair Scanner App

This guide explains how to configure DataWedge on the Zebra MC2200 to work with the Fair Scanner app.

## Overview

DataWedge is Zebra's barcode scanning solution that intercepts scanner input and can output it in various formats. For the Fair Scanner app, we'll configure it to output keystrokes to a hidden text input.

## Method 1: Keystroke Output (Recommended)

### Step 1: Create DataWedge Profile

1. Open **DataWedge** app on the device
2. Tap **+** to create a new profile
3. Name it: `FairScanner`
4. Set **Associated app** to: `com.fairscanner.app`

### Step 2: Configure Barcode Input

1. In the profile, go to **Barcode Input**
2. Enable **Barcode Input**
3. Select **Symbologies** and enable:
   - **EAN-13** ✓
   - **EAN-8** ✓
   - **Code 128** ✓ (optional)
   - **Code 39** ✓ (optional)

### Step 3: Configure Keystroke Output

1. Go to **Keystroke Output**
2. Enable **Keystroke Output**
3. Set **Key Event** to: `Send Enter Key`
4. Set **Key Event Action** to: `Send Enter Key After Data`

### Step 4: Configure Intent Output (Optional)

If you want to use Intent output instead of keystrokes:

1. Go to **Intent Output**
2. Enable **Intent Output**
3. Set **Intent Action** to: `com.fairscanner.BARCODE`
4. Set **Intent Category** to: `android.intent.category.DEFAULT`
5. Add **Intent Data**:
   - **Key**: `com.symbol.datawedge.data_string`
   - **Value**: `%s` (this will contain the scanned data)
6. Add **Intent Data**:
   - **Key**: `label_type`
   - **Value**: `%t` (this will contain the barcode type)

## Method 2: Intent Output (Alternative)

### Intent Configuration

- **Action**: `com.fairscanner.BARCODE`
- **Category**: `android.intent.category.DEFAULT`
- **Data**: 
  - `com.symbol.datawedge.data_string` = scanned barcode
  - `label_type` = barcode type (EAN-13, EAN-8, etc.)

### App Intent Handling

The app includes a stub for handling intents, but the keystroke method is more reliable for the current implementation.

## Testing the Setup

1. Open the Fair Scanner app
2. Navigate to the Scan screen
3. Scan any EAN barcode
4. You should see:
   - Haptic feedback (vibration)
   - The scanned EAN appears in the "Siste skann" chip
   - Product details are displayed if found in the database

## Troubleshooting

### Scanner Not Working

1. **Check Profile Association**: Ensure the profile is associated with `com.fairscanner.app`
2. **Verify Barcode Input**: Make sure barcode input is enabled
3. **Check Keystroke Output**: Ensure keystroke output is enabled
4. **Test with Text Editor**: Try scanning in a text editor to verify scanner works

### Wrong Data Format

1. **Check Symbologies**: Ensure EAN-13 and EAN-8 are enabled
2. **Verify Output Format**: Check that keystroke output is configured correctly

### App Not Responding

1. **Restart App**: Close and reopen the Fair Scanner app
2. **Check Permissions**: Ensure the app has necessary permissions
3. **Reboot Device**: Sometimes a device reboot is needed after DataWedge changes

## Advanced Configuration

### Multiple Profiles

You can create different profiles for different scenarios:
- **FairScanner_Production**: For production use
- **FairScanner_Test**: For testing with different settings

### Custom Intent Actions

You can modify the intent action to match your specific needs:
- Change `com.fairscanner.BARCODE` to any custom action
- Update the app's intent handling accordingly

### Barcode Validation

DataWedge can be configured to only accept valid EAN codes:
1. Go to **Barcode Input** → **Symbologies**
2. Enable only the symbologies you need
3. Use **Data Validation** if available

## Support

If you continue to have issues:

1. Check the Zebra DataWedge documentation
2. Verify your MC2200 firmware version
3. Test with the Zebra DataWedge demo app
4. Contact Zebra support if hardware issues persist

## Notes

- The keystroke method is more reliable than intent output
- Always test with real barcodes, not just test patterns
- Keep DataWedge profiles simple to avoid conflicts
- Document any custom configurations for future reference
