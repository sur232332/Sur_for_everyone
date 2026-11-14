import { Language } from '../types/hardware';

export const TRANSLATIONS: Record<
  Language,
  {
    nav: {
      showroom: string;
      samsung: string;
      apple: string;
      huawei: string;
      compare: string;
      homeGuide: string;
      bag: string;
      favorites: string;
    };
    hero: {
      kicker: string;
      titleLine1: string;
      titleLine2: string;
      subtitle: string;
      exploreCompare: string;
      launchAr: string;
      liveMarketTitle: string;
    };
    filters: {
      searchPlaceholder: string;
      allBrands: string;
      allCategories: string;
      maxPrice: string;
      favoritesOnly: string;
      noResults: string;
      resetFilters: string;
    };
    brandPage: {
      backToShowroom: string;
      modelsCount: string;
      selectModel: string;
      visualDetails3D: string;
      technicalSpecs: string;
      benchmarks: string;
      singleCore: string;
      multiCore: string;
      gpuScore: string;
      peakLuminance: string;
      dimensionsWeight: string;
      finishes: string;
      storageConfig: string;
      livePrice: string;
      msrp: string;
      inStock: string;
      lowStock: string;
      addToBag: string;
      addedToBag: string;
      viewInAr: string;
      compareThis: string;
      officialSpecs: string;
      priceAlertBtn: string;
      priceAlertSet: string;
      priceAlertPrompt: string;
    };
    viewport3D: {
      dragHint: string;
      tapLayerHint: string;
      xrayExplode: string;
      lidAngle: string;
      foldAngle: string;
      retractLens: string;
      extendLens: string;
      autoSpin: string;
      resetView: string;
      loadingModel: string;
      selectedLayer: string;
      clearLayer: string;
      presets: {
        iso: string;
        front: string;
        back: string;
        edge: string;
      };
      layers: {
        back_glass: string;
        battery: string;
        logic_board: string;
        camera_module: string;
        display: string;
      };
      webglFallback: string;
    };
    compare: {
      title: string;
      subtitle: string;
      deviceA: string;
      deviceB: string;
      deviceC: string;
      addThirdDevice: string;
      removeThirdDevice: string;
      overlayMode: string;
      sideBySideMode: string;
      syncRotation: string;
      syncExplode: string;
      trueScale: string;
      priceComparison: string;
      priceDelta: string;
      specMatrix: string;
      winnerBadge: string;
      processor: string;
      display: string;
      graphics: string;
      camera: string;
      memory: string;
      battery: string;
      chassis: string;
      connectivity: string;
      dimensions: string;
      thickness: string;
      weight: string;
      priceRow: string;
      launchArA: string;
      launchArB: string;
      launchArC: string;
      benchmarkBars: string;
      quizBtn: string;
      quizTitle: string;
      quizSubtitle: string;
      quizQ1: string;
      quizQ1Opts: [string, string, string];
      quizQ2: string;
      quizQ2Opts: [string, string, string];
      quizQ3: string;
      quizQ3Opts: [string, string, string];
      quizRecommendation: string;
      quizSelectWinner: string;
    };
    ar: {
      title: string;
      placeInRoom: string;
      modeModelViewer: string;
      modeCamera: string;
      modeStudioGrid: string;
      qrTitle: string;
      qrSubtitle: string;
      rulerToggle: string;
      dimensionsRuler: string;
      cameraDeniedHint: string;
      dragToPlace: string;
      scale1to1: string;
      scaleMacro: string;
      scaleLabel: string;
      rotateLabel: string;
      xrayLabel: string;
      capturePhoto: string;
      photoSaved: string;
      closeAr: string;
      physicalSize: string;
      preparingGlb: string;
    };
    cart: {
      title: string;
      empty: string;
      emptySub: string;
      subtotal: string;
      discount: string;
      shipping: string;
      total: string;
      promoPlaceholder: string;
      promoApply: string;
      promoApplied: string;
      promoHint: string;
      liveRateNote: string;
      step1Title: string;
      step2Title: string;
      step3Title: string;
      nextStep: string;
      prevStep: string;
      fullName: string;
      email: string;
      phone: string;
      city: string;
      address: string;
      deliveryStandard: string;
      deliveryExpress: string;
      placeOrder: string;
      processing: string;
      confirmedTitle: string;
      orderNumber: string;
      continueShopping: string;
      remove: string;
      validationError: string;
    };
    pricing: {
      liveFeed: string;
      updatedNow: string;
      sparkline7d: string;
      currencyUsd: string;
      currencyEur: string;
      currencyAmd: string;
    };
  }
> = {
  en: {
    nav: {
      showroom: 'Gallery',
      samsung: 'Samsung',
      apple: 'Apple',
      huawei: 'Huawei',
      compare: 'Compare 3D',
      homeGuide: '3D Walkthrough',
      bag: 'Bag',
      favorites: 'Saved',
    },
    hero: {
      kicker: 'Interactive 3D & Augmented Reality Hardware Gallery',
      titleLine1: 'Inspect Silicon.',
      titleLine2: 'Experience Flagships.',
      subtitle:
        'Rotate, disassemble into 5 interactive X-Ray layers, compare up to 3 devices at true relative scale, and place Samsung, Apple, and Huawei models in your room with live pricing.',
      exploreCompare: 'Open 3D Comparison Studio',
      launchAr: 'Place in Your Room (AR)',
      liveMarketTitle: 'Live Market Pricing & Directory',
    },
    filters: {
      searchPlaceholder: 'Search model, processor, or specification...',
      allBrands: 'All Brands',
      allCategories: 'All Categories',
      maxPrice: 'Max Price',
      favoritesOnly: 'Favorites',
      noResults: 'No devices match your current filters.',
      resetFilters: 'Reset Filters',
    },
    brandPage: {
      backToShowroom: 'Showroom',
      modelsCount: 'Models',
      selectModel: 'Select Device',
      visualDetails3D: '3D Visual Inspection Hotspots',
      technicalSpecs: 'Technical Specifications',
      benchmarks: 'Performance Telemetry',
      singleCore: 'Single-Core',
      multiCore: 'Multi-Core',
      gpuScore: 'GPU Compute',
      peakLuminance: 'Peak Nits',
      dimensionsWeight: 'Dimensions & Mass',
      finishes: 'Material Finish',
      storageConfig: 'Configuration',
      livePrice: 'Live Market Price',
      msrp: 'MSRP',
      inStock: 'In Stock',
      lowStock: 'Limited Stock',
      addToBag: 'Add to Bag',
      addedToBag: 'Added to Bag',
      viewInAr: 'Place in Your Room (AR)',
      compareThis: 'Compare 3D',
      officialSpecs: 'Manufacturer Specs',
      priceAlertBtn: 'Set Price Alert',
      priceAlertSet: 'Alert Active',
      priceAlertPrompt: 'Notify me when price drops below',
    },
    viewport3D: {
      dragHint: 'Drag to orbit · Pinch/Scroll to zoom · Double-tap to reset',
      tapLayerHint: 'Tap any exploded layer in 3D or below to inspect its specs',
      xrayExplode: 'X-Ray Explode',
      lidAngle: 'Lid Angle',
      foldAngle: 'Fold Angle',
      retractLens: 'Retract 1" Lens',
      extendLens: 'Extend 1" Lens',
      autoSpin: 'Auto-Orbit',
      resetView: 'Reset',
      loadingModel: 'Synthesizing PBR 3D Geometry...',
      selectedLayer: 'Inspected Layer',
      clearLayer: 'Clear Highlight',
      presets: {
        iso: '3/4 Studio',
        front: 'Display',
        back: 'Rear Optics',
        edge: 'Profile',
      },
      layers: {
        back_glass: 'Back Glass',
        battery: 'Battery',
        logic_board: 'Logic & Chip',
        camera_module: 'Camera Module',
        display: 'Display',
      },
      webglFallback: '3D hardware preview running in software compatibility mode.',
    },
    compare: {
      title: 'Interactive 3D Comparison Studio',
      subtitle:
        'Compare up to 3 flagship devices side-by-side at true proportional scale or stacked in 3D Overlay Mode. Row winners are highlighted automatically.',
      deviceA: 'Device 1',
      deviceB: 'Device 2',
      deviceC: 'Device 3',
      addThirdDevice: '+ Add 3rd Device',
      removeThirdDevice: 'Remove 3rd Device',
      overlayMode: '3D Overlay Mode',
      sideBySideMode: 'Side-by-Side View',
      syncRotation: 'Sync Rotation',
      syncExplode: 'Sync X-Ray',
      trueScale: 'True Relative Scale',
      priceComparison: 'Live Price Spread',
      priceDelta: 'Spread',
      specMatrix: 'Specification & Winner Matrix',
      winnerBadge: 'Winner',
      processor: 'Chip / SoC',
      display: 'Screen',
      graphics: 'Graphics',
      camera: 'Camera System',
      memory: 'Memory & Storage',
      battery: 'Battery & Charge',
      chassis: 'Chassis',
      connectivity: 'Connectivity',
      dimensions: 'Dimensions',
      thickness: 'Thickness',
      weight: 'Weight',
      priceRow: 'Live Price',
      launchArA: 'AR Device 1',
      launchArB: 'AR Device 2',
      launchArC: 'AR Device 3',
      benchmarkBars: 'Relative Benchmark Comparison',
      quizBtn: 'Which one is for me?',
      quizTitle: 'Personal Hardware Advisor',
      quizSubtitle: 'Answer 3 quick questions to find your ideal flagship match.',
      quizQ1: '1. What is your target budget?',
      quizQ1Opts: ['Under $1,350', '$1,350 – $2,400', 'No-compromise ($2,400+)'],
      quizQ2: '2. How important is pro zoom & camera versatility?',
      quizQ2Opts: ['Everyday snaps', '5x Optical & 4K Pro Video', '1-Inch Sensor / 200MP Zoom'],
      quizQ3: '3. What is your primary workflow?',
      quizQ3Opts: ['Pocket Flagship', 'Foldable Multitasking', 'Desktop-Class Laptop / 3D'],
      quizRecommendation: 'Recommended Match',
      quizSelectWinner: 'Load into Comparison Slot 1',
    },
    ar: {
      title: 'Augmented Reality Studio & Real-Size Placement',
      placeInRoom: 'Place in Your Room (WebXR / Quick Look)',
      modeModelViewer: '3D Model Viewer (AR Ready)',
      modeCamera: 'Live Camera AR Overlay',
      modeStudioGrid: 'Spatial Calibration Surface',
      qrTitle: 'Scan for Mobile AR',
      qrSubtitle:
        'Native room placement (WebXR / Scene Viewer / Quick Look) requires a mobile AR browser. Scan this QR code on your phone or use the interactive real-size camera calibration stage.',
      rulerToggle: 'Dimensions Ruler',
      dimensionsRuler: '1:1 Millimeter Ruler',
      cameraDeniedHint:
        'Camera stream unavailable — running 1:1 Spatial Surface Calibration mode with millimeter dimension rulers.',
      dragToPlace: 'Drag to position · Pinch or slide to calibrate 1:1 real-world size',
      scale1to1: '1:1 Real Size',
      scaleMacro: '2.0x Macro',
      scaleLabel: 'Scale',
      rotateLabel: 'Yaw Rotation',
      xrayLabel: 'X-Ray in AR',
      capturePhoto: 'Capture AR Shot',
      photoSaved: 'AR Snapshot Saved',
      closeAr: 'Exit AR',
      physicalSize: 'True Physical Footprint',
      preparingGlb: 'Generating 1:1 GLB Model for AR...',
    },
    cart: {
      title: 'Shopping Bag',
      empty: 'Your bag is empty',
      emptySub: 'Configure a Samsung, Apple, or Huawei device and lock in live pricing.',
      subtotal: 'Subtotal',
      discount: 'Promo Discount',
      shipping: 'Delivery',
      total: 'Total',
      promoPlaceholder: 'Promo code (try PULSE10)',
      promoApply: 'Apply',
      promoApplied: '10% PULSE10 applied',
      promoHint: 'Use code PULSE10 for 10% off',
      liveRateNote: 'Prices locked at checkout against live market stream',
      step1Title: '1. Bag & Promo',
      step2Title: '2. Delivery Details',
      step3Title: '3. Review & Confirm',
      nextStep: 'Continue',
      prevStep: 'Back',
      fullName: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      city: 'Delivery City (e.g. Yerevan, Gyumri, London)',
      address: 'Street Address & Apartment',
      deliveryStandard: 'Standard Insured Courier (Free)',
      deliveryExpress: 'Express Priority Air (+$25)',
      placeOrder: 'Confirm & Place Order',
      processing: 'Confirming...',
      confirmedTitle: 'Order Confirmed',
      orderNumber: 'Order Reference',
      continueShopping: 'Continue Exploring',
      remove: 'Remove',
      validationError: 'Please fill in all required contact and delivery fields.',
    },
    pricing: {
      liveFeed: 'Live Pricing Feed',
      updatedNow: '7-day trend',
      sparkline7d: '7D Trend',
      currencyUsd: 'USD ($)',
      currencyEur: 'EUR (€)',
      currencyAmd: 'AMD (֏)',
    },
  },
  hy: {
    nav: {
      showroom: 'Կատալոգ',
      samsung: 'Samsung',
      apple: 'Apple',
      huawei: 'Huawei',
      compare: '3D Համեմատություն',
      homeGuide: '3D Շրջայց',
      bag: 'Զամբյուղ',
      favorites: 'Պահպանված',
    },
    hero: {
      kicker: 'Ինտերակտիվ 3D և Լրացված Իրականության (AR) Ցուցասրահ',
      titleLine1: 'Զննեք Կրեմնիումը։',
      titleLine2: 'Ընտրեք Ֆլագմանը։',
      subtitle:
        'Պտտեք 360°, բացեք 5 ինտերակտիվ X-Ray շերտերը, համեմատեք մինչև 3 սարք իրական մասշտաբով և տեղադրեք Samsung, Apple ու Huawei մոդելները Ձեր սենյակում՝ ուղիղ գներով։',
      exploreCompare: 'Բացել 3D Համեմատությունը',
      launchAr: 'Տեղադրել Սենյակում (AR)',
      liveMarketTitle: 'Ուղիղ Շուկայական Գներ և Կատալոգ',
    },
    filters: {
      searchPlaceholder: 'Որոնել մոդել, պրոցեսոր կամ բնութագիր...',
      allBrands: 'Բոլոր Բրենդները',
      allCategories: 'Բոլոր Տեսակները',
      maxPrice: 'Առավելագույն Գին',
      favoritesOnly: 'Նախընտրածներ',
      noResults: 'Ընտրված ֆիլտրերով սարքեր չեն գտնվել։',
      resetFilters: 'Մաքրել Ֆիլտրերը',
    },
    brandPage: {
      backToShowroom: 'Ցուցասրահ',
      modelsCount: 'Մոդել',
      selectModel: 'Ընտրել Սարքը',
      visualDetails3D: '3D Տեսողական Կետեր և Մանրամասներ',
      technicalSpecs: 'Տեխնիկական Բնութագրեր',
      benchmarks: 'Արտադրողականության Տվյալներ',
      singleCore: 'Մեկ Միջուկ',
      multiCore: 'Բազմամիջուկ',
      gpuScore: 'Գրաֆիկա (GPU)',
      peakLuminance: 'Պայծառություն',
      dimensionsWeight: 'Չափսեր և Քաշ',
      finishes: 'Կորպուսի Գույն և Նյութ',
      storageConfig: 'Կոնֆիգուրացիա',
      livePrice: 'Իրական Ժամանակի Գին',
      msrp: 'Բազային Գին',
      inStock: 'Առկա է',
      lowStock: 'Սահմանափակ քանակ',
      addToBag: 'Ավելացնել Զամբյուղ',
      addedToBag: 'Ավելացված է',
      viewInAr: 'Տեղադրել Սենյակում (AR)',
      compareThis: 'Համեմատել 3D',
      officialSpecs: 'Պաշտոնական Տվյալներ',
      priceAlertBtn: 'Գնի Ծանուցում',
      priceAlertSet: 'Ծանուցումն Ակտիվ է',
      priceAlertPrompt: 'Ծանուցել, երբ գինը իջնի նշվածից՝',
    },
    viewport3D: {
      dragHint: 'Քաշեք պտտելու համար · Մոտեցրեք · Կրկնակի հպեք վերականգնելու համար',
      tapLayerHint: 'Հպեք ցանկացած X-Ray շերտին 3D-ում կամ ներքևում՝ տվյալները տեսնելու համար',
      xrayExplode: 'X-Ray Բացում',
      lidAngle: 'Էկրանի Անկյուն',
      foldAngle: 'Ծալման Անկյուն',
      retractLens: 'Փակել 1" Օբյեկտիվը',
      extendLens: 'Բացել 1" Օբյեկտիվը',
      autoSpin: 'Ավտո-Պտույտ',
      resetView: 'Վերականգնել',
      loadingModel: '3D PBR Մոդելի Կառուցում...',
      selectedLayer: 'Ընտրված Շերտ',
      clearLayer: 'Մաքրել Ընտրությունը',
      presets: {
        iso: '3/4 Ստուդիա',
        front: 'Էկրան',
        back: 'Տեսախցիկներ',
        edge: 'Պրոֆիլ',
      },
      layers: {
        back_glass: 'Հետևի Ապակի',
        battery: 'Մարտկոց',
        logic_board: 'Պլատա և Չիպ',
        camera_module: 'Տեսախցիկ',
        display: 'Էկրան',
      },
      webglFallback: '3D ցուցադրումը գործարկվում է համատեղելիության ռեժիմում։',
    },
    compare: {
      title: 'Ինտերակտիվ 3D Համեմատության Ստուդիա',
      subtitle:
        'Համեմատեք մինչև 3 սարք կողք կողքի իրական մասշտաբով կամ 3D Վրադրման (Overlay) ռեժիմով։ Յուրաքանչյուր տողի հաղթողը նշվում է ավտոմատ։',
      deviceA: 'Սարք 1',
      deviceB: 'Սարք 2',
      deviceC: 'Սարք 3',
      addThirdDevice: '+ Ավելացնել 3-րդ Սարք',
      removeThirdDevice: 'Հեռացնել 3-րդ Սարքը',
      overlayMode: '3D Վրադրման Ռեժիմ',
      sideBySideMode: 'Կողք-Կողքի Դիտում',
      syncRotation: 'Սինխրոն Պտույտ',
      syncExplode: 'Սինխրոն X-Ray',
      trueScale: 'Իրական 1:1 Մասշտաբ',
      priceComparison: 'Գնային Համեմատություն',
      priceDelta: 'Տարբերություն',
      specMatrix: 'Տեխնիկական Համեմատական և Հաղթողների Աղյուսակ',
      winnerBadge: 'Լավագույն',
      processor: 'Պրոցեսոր / Չիպ',
      display: 'Էկրան',
      graphics: 'Գրաֆիկա',
      camera: 'Տեսախցիկ',
      memory: 'Հիշողություն',
      battery: 'Մարտկոց',
      chassis: 'Կորպուս',
      connectivity: 'Կապ',
      dimensions: 'Չափսեր',
      thickness: 'Հաստություն',
      weight: 'Քաշ',
      priceRow: 'Ուղիղ Գին',
      launchArA: 'AR Սարք 1',
      launchArB: 'AR Սարք 2',
      launchArC: 'AR Սարք 3',
      benchmarkBars: 'Հաշվարկային Հզորության Համեմատություն',
      quizBtn: 'Ո՞րն է ինձ հարմար',
      quizTitle: 'Անհատական Սարքի Խորհրդատու',
      quizSubtitle: 'Պատասխանեք 3 արագ հարցի՝ Ձեզ ամենահարմար մոդելը գտնելու համար։',
      quizQ1: '1. Որքա՞ն է Ձեր նախատեսած բյուջեն.',
      quizQ1Opts: ['Մինչև $1,350', '$1,350 – $2,400', 'Առանց սահմանափակման ($2,400+)'],
      quizQ2: '2. Որքա՞ն կարևոր է պրոֆեսիոնալ տեսախցիկը և զումը.',
      quizQ2Opts: ['Ամենօրյա նկարահանում', '5x Օպտիկական և 4K Pro Վիդեո', '1" Սենսոր / 200ՄՊ Զում'],
      quizQ3: '3. Ո՞րն է Ձեր հիմնական աշխատանքային ոճը.',
      quizQ3Opts: ['Դասական Ֆլագման', 'Ծալովի Բազմախնդրություն', 'Հզոր Նոութբուք / 3D Աշխատանք'],
      quizRecommendation: 'Առաջարկվող Մոդել',
      quizSelectWinner: 'Բեռնել Համեմատության Դաշտ 1',
    },
    ar: {
      title: 'Լրացված Իրականություն (AR) և 1:1 Չափսերով Տեղադրում',
      placeInRoom: 'Տեղադրել Սենյակում (WebXR / Quick Look)',
      modeModelViewer: '3D Model Viewer (AR)',
      modeCamera: 'Ուղիղ Տեսախցիկ (AR)',
      modeStudioGrid: 'Տարածական Կալիբրացման Հարթություն',
      qrTitle: 'Սկանավորեք Հեռախոսով AR-ի Համար',
      qrSubtitle:
        'WebXR / Scene Viewer / Quick Look սենյակային տեղադրումը հասանելի է սմարթֆոններով։ Սկանավորեք QR կոդը հեռախոսով կամ օգտագործեք 1:1 իրական չափսի տեսախցիկի ռեժիմը։',
      rulerToggle: 'Չափսերի Քանոն',
      dimensionsRuler: '1:1 Միլիմետրային Քանոն',
      cameraDeniedHint:
        'Տեսախցիկը հասանելի չէ․ ակտիվացված է 1:1 տարածական սեղանի կալիբրացման ռեժիմը՝ միլիմետրային քանոնով։',
      dragToPlace: 'Քաշեք տեղաշարժելու համար · Կարգավորեք պտույտն ու 1:1 մասշտաբը',
      scale1to1: '1:1 Իրական Չափս',
      scaleMacro: '2.0x Մակրո',
      scaleLabel: 'Մասշտաբ',
      rotateLabel: 'Հորիզոնական Պտույտ',
      xrayLabel: 'X-Ray AR-ում',
      capturePhoto: 'Լուսանկարել AR-ում',
      photoSaved: 'AR Նկարը Պահպանվեց',
      closeAr: 'Դուրս գալ AR-ից',
      physicalSize: 'Իրական Չափսեր',
      preparingGlb: 'Պատրաստվում է 1:1 GLB մոդելը AR-ի համար...',
    },
    cart: {
      title: 'Գնումների Զամբյուղ',
      empty: 'Ձեր զամբյուղը դատարկ է',
      emptySub: 'Ընտրեք Samsung, Apple կամ Huawei սարք և ամրագրեք ուղիղ գինը։',
      subtotal: 'Միջանկյալ Արժեք',
      discount: 'Պրոմո Զեղչ',
      shipping: 'Առաքում',
      total: 'Ընդհանուր',
      promoPlaceholder: 'Պրոմո կոդ (օր.՝ PULSE10)',
      promoApply: 'Կիրառել',
      promoApplied: '10% PULSE10 զեղչն ակտիվ է',
      promoHint: 'Օգտագործեք PULSE10 կոդը 10% զեղչի համար',
      liveRateNote: 'Գները ամրագրվում են պատվերի պահին գործող ուղիղ շուկայական սակագնով',
      step1Title: '1. Զամբյուղ',
      step2Title: '2. Առաքման Տվյալներ',
      step3Title: '3. Հաստատում',
      nextStep: 'Շարունակել',
      prevStep: 'Հետ',
      fullName: 'Անուն Ազգանուն',
      email: 'Էլ. Փոստ',
      phone: 'Հեռախոսահամար',
      city: 'Առաքման Քաղաք (օր.՝ Երևան, Գյումրի)',
      address: 'Փողոց, Շենք, Բնակարան',
      deliveryStandard: 'Ստանդարտ Ապահովագրված Առաքում (Անվճար)',
      deliveryExpress: 'Էքսպրես Արագ Առաքում (+$25)',
      placeOrder: 'Հաստատել Պատվերը',
      processing: 'Հաստատվում է...',
      confirmedTitle: 'Պատվերը Հաստատված է',
      orderNumber: 'Պատվերի Համար',
      continueShopping: 'Շարունակել Դիտումը',
      remove: 'Հեռացնել',
      validationError: 'Խնդրում ենք լրացնել բոլոր պարտադիր դաշտերը։',
    },
    pricing: {
      liveFeed: 'Ուղիղ Գնային Հոսք',
      updatedNow: '7 օրվա դինամիկա',
      sparkline7d: '7Օր Գրաֆիկ',
      currencyUsd: 'USD ($)',
      currencyEur: 'EUR (€)',
      currencyAmd: 'AMD (֏)',
    },
  },
};
