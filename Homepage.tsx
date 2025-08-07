import Banner from "@/components/Banner/banner";
import BikeListing from "@/components/Homepage/BikeListing";
import Feature from "@/components/Homepage/Feature";
import Placeholder from "@/components/Homepage/Placeholder";
import ClientReviews from "@/components/About/ClientReviews";
import StatiContent from "@/components/StaticContent/StaticContent";
import LocateUs from "@/components/Homepage/LocateUs";
import NotFound from "./not-found";
import { Metadata } from "next/types";
import { headers } from "next/headers";
import Section from "@/components/AllPages";
import { getCookieData, fetchWithErrorHandling, fetchDealerByDomain, siteSettingByDealerCode } from "@/components/CommonComponents/CommonService";
import { replaceMetacontent, faviconMap, stripHtmlTags } from "@/components/CommonComponents/Constant";
interface Pagesettings {
  metaTitle: string;
  metaDesc: string;
  metaTags: string;
  isXML: boolean;
  isIndex: boolean;
  isCrawl: boolean;
  isPage: boolean;
  rewriteUrl: string;
  canonicalUrl: string;
  newURL: string;
  type: string;
}

interface NewData {
  bannerArr: any;
  tabs: any;
  features: any;
  placeholder: any;
  clientData: any;
  homepageSection: any;
  page_settings?: Pagesettings; // Optional
  dealer?: any;
  sections: any;
}

async function getDealerData(): Promise<NewData> {
  const API_CONTENTS_URL = process.env.NEXT_PUBLIC_BASE_API_URL;
  const hostHeader = headers().get("host");
  let dealer = await getCookieData();

  let mainHostHeader = hostHeader?.startsWith("www.")
    ? hostHeader.substring(4)
    : hostHeader;

  if (!dealer || !dealer.dealer_code) {
    const dealerResponse = await fetchDealerByDomain(${mainHostHeader});

    if (dealerResponse) {
      const siteSettingResponse = await siteSettingByDealerCode(${dealerResponse?.dealer_code});

      dealer = dealerResponse || null;
      if (siteSettingResponse?.data?.dealerInfo) {
        dealer.gmb_url = siteSettingResponse.data.dealerInfo.gmb_url || null;
        dealer.location_url = siteSettingResponse.data.dealerInfo.location_url || null;
      }
    }
  }

  const [homepageResponse, testimonialsResponse] = await Promise.all([
    fetchWithErrorHandling(
      ${API_CONTENTS_URL}homepage?dealer_code=${dealer?.dealer_code}&lang=en&host=${mainHostHeader}
    ),
    fetchWithErrorHandling(
      ${API_CONTENTS_URL}testimonial?dealer_code=${dealer?.dealer_code}&lang=en
    ),
  ]);


  const homepageData = homepageResponse || {};
  const testimonialsData = testimonialsResponse || {};

  // Create a map for faster lookups
  const sections = homepageData?.data?.sections || [];
  const sectionsMap = sections.reduce((map: Record<string, any>, section: any) => {
    if (section.key) {
      map[section.key] = section;
    }
    return map;
  }, {});


  const tabs = sectionsMap["explore-our-range"] || [];
  const features = sectionsMap["more-from-us"] || [];
  const placeholder = sectionsMap["know-our-dealership"] || {};

  const defaultPageSettings = {
    metaTitle: "Default Title",
    metaDesc: "Default Description",
    metaTags: "Default Keywords",
    isXML: false,
    isIndex: true,
    isCrawl: true,
    isPage: true,
    rewriteUrl: "",
    canonicalUrl: "Default Canonical URL",
    newURL: "",
    type: "none",
  };

  return {
    bannerArr: homepageData?.data?.banners || [],
    tabs,
    features,
    placeholder,
    clientData: testimonialsData?.data || [],
    homepageSection: homepageData?.data || [],
    dealer: dealer || {},
    page_settings: homepageData?.data?.page_settings || defaultPageSettings,
    sections: sections
  };
}

// Fetch and set the metadata
export async function generateMetadata(): Promise<Metadata> {
  const pageData = await getDealerData();
  const headersList = headers(); // Get the headers of the request
  const hostname = headersList.get('host'); // Get the hostname from headers
  const dealerSlug = pageData?.page_settings?.canonicalUrl;

  // Check if hostname is part of dealerSlug
  let finalSlug;

  if (dealerSlug) {
    if (dealerSlug.startsWith(https://${hostname}) || dealerSlug.startsWith(http://${hostname})) {
      // Extract slug after hostname
      finalSlug = dealerSlug.replace(https://${hostname}/, '').replace(http://${hostname}/, '');
    } else {
      finalSlug = dealerSlug;
    }
  } else {
    finalSlug = ''; // Handle cases where dealerSlug is undefined or null
  }

  // const canonicalUrlNew = dealerSlug ? https://${hostname}/${dealerSlug} : https://${hostname};
  const canonicalUrlNew = finalSlug ? https://${hostname}${finalSlug} : https://${hostname};
  // Provide a default value if page_settings is undefined
  const metaSettings: Pagesettings = pageData.page_settings || {
    metaTitle: "Default Title ffd",
    metaDesc: "Default Description",
    metaTags: "Default Keywords",
    isXML: false,
    isIndex: true,
    isCrawl: true,
    isPage: true,
    rewriteUrl: "",
    canonicalUrl: "Default Canonical URL",
    newURL: "",
    type: "none",
  };
  const faviconUrl = faviconMap['SMIPL'];
  return {
    title: stripHtmlTags(replaceMetacontent(metaSettings.metaTitle, pageData?.dealer)) || "Default Title",
    description: stripHtmlTags(replaceMetacontent(metaSettings.metaDesc, pageData?.dealer)) || "Default Description",
    keywords: stripHtmlTags(replaceMetacontent(metaSettings.metaTags, pageData?.dealer)) || "Default Keywords",
    alternates: {
      canonical: canonicalUrlNew,
    },
    robots: {
      index: metaSettings.isIndex,
      follow: metaSettings.isCrawl,
    },
    other: {
      "xml-site-map": metaSettings.isXML ? "true" : "false",
      "auto-redirect-type": metaSettings.type,
      "auto-redirect-url": metaSettings.newURL,
    },
    icons: {
      icon: faviconUrl, // ✅ This replaces <link rel="icon" href="..." />
    },
  };
}

export default async function Home() {
  const newData = await getDealerData();
  if (
    !newData.homepageSection ||
    Object.keys(newData.homepageSection).length === 0
  ) {
    return <NotFound />;
    // notFound(); // ✅ This triggers actual HTTP 404
  }
  // const videoSections = newData.sections?.filter((section: any) => section.type === "Video");
  return (
    <>
      <div className="flex flex-col items-center justify-center"></div>
      {newData.bannerArr && <Banner bannerData={newData.bannerArr} />}
      {newData.tabs?.data && newData.tabs?.data?.length > 0 && (
        <BikeListing title={newData?.tabs?.title} tabs={newData.tabs?.data} />
      )}
      {newData?.features?.data && newData?.features?.data?.length > 0 && (
        <Feature
          homeData={newData?.features?.data}
          title={newData?.features?.title}
        />
      )}
      {newData?.dealer &&
        <LocateUs dealerData={newData?.dealer} />
      }

      {newData?.dealer && newData.placeholder.data?.length !== 0 && (
        <StatiContent props={newData?.dealer} />
      )}

      {newData.placeholder.data && newData.placeholder.data?.length > 0 && (
        <Placeholder data={newData.placeholder.data} dealer={newData.dealer} />
      )}
      {/* compo */}

      <div className="container-fluid">
        <div className="container mx-auto">
          {newData.sections?.length > 0 && (
            <Section
              props={newData.sections}
              product_details={{}}
              dealerData={{}}
            />
          )}
        </div>
      </div>

      {newData?.clientData && newData?.clientData?.length > 0 && (
        <ClientReviews data={newData.clientData} dealerData={newData?.dealer} />
      )}
    </>
  );
}
