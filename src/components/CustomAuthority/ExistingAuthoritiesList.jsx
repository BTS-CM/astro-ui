// src/components/CustomAuthority/ExistingAuthoritiesList.jsx
import React from 'react';
import { FixedSizeList as List } from "react-window";
// Removed unused Card imports
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExternalLink from "../common/ExternalLink.jsx"; // Assuming this component exists and works

export default function ExistingAuthoritiesList({ authorities, selectedAuthorityId, setSelectedAuthorityId, opTypes, t }) {

  const AuthorityRow = ({ index, style }) => {
    const auth = authorities[index];
    if (!auth) return null;

    const operationName = opTypes[auth.operation_type] || `Unknown (${auth.operation_type})`;
    const isValidDate = auth.valid_to && !isNaN(new Date(auth.valid_to + "Z").getTime());
    const validToStr = isValidDate ? new Date(auth.valid_to + "Z").toLocaleDateString() : "Invalid Date";


    return (
        // Add padding to the style for spacing inside the virtual list item
        <div style={{ ...style, paddingRight: '8px', boxSizing: 'border-box' }} className="flex items-center space-x-2 border-b">
             <RadioGroupItem
                value={auth.id}
                id={auth.id}
                checked={selectedAuthorityId === auth.id}
                // Use onValueChange on the parent RadioGroup, onClick might interfere
                // onClick={() => setSelectedAuthorityId(auth.id)}
             />
            <Label htmlFor={auth.id} className="flex-grow cursor-pointer p-2"> {/* Added padding */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-2 gap-y-1"> {/* Responsive grid */}
                   {/* Use ExternalLink safely */}
                   <span className="truncate text-xs sm:text-sm" title={auth.id}>
                       {typeof ExternalLink !== 'undefined' ? (
                           <ExternalLink
                                classnamecontents="text-blue-500 hover:underline"
                                type="text"
                                text={auth.id}
                                // TODO: Use chain name from props/context to build correct explorer URL
                                hyperlink={`https://blocksights.info/#/objects/${auth.id}`}
                            />
                       ) : (
                            auth.id // Fallback if ExternalLink is missing
                       )}
                   </span>
                   <span className="text-xs truncate" title={operationName}>{operationName}</span>
                   <span className="text-xs">{t('ExistingAuthoritiesList:listEnabled')}: {auth.enabled ? 'Yes' : 'No'}</span>
                   <span className="text-xs truncate" title={auth.valid_to}>
                     {t('ExistingAuthoritiesList:listValidTo')}: {validToStr}
                   </span>
                </div>
            </Label>
        </div>
    );
  };

  return (
    <div className="mb-4">
      <Label className="text-lg font-semibold">{t('ExistingAuthoritiesList:selectAuthorityLabel')}</Label>
      <ScrollArea className="h-48 w-full rounded-md border mt-2 bg-muted/30"> {/* Added subtle background */}
         {/* Use onValueChange for controlled RadioGroup */}
         <RadioGroup value={selectedAuthorityId || ""} onValueChange={setSelectedAuthorityId}>
           {authorities.length > 0 ? (
                <List
                  height={190} // Adjust height as needed
                  itemCount={authorities.length}
                  itemSize={48} // Slightly increase item size for better spacing/touch
                  width="100%"
                >
                  {AuthorityRow}
                </List>
              ) : (
                <div className="flex items-center justify-center h-full">
                     <p className="p-4 text-sm text-muted-foreground">{t('ExistingAuthoritiesList:noExistingAuthorities')}</p>
                </div>
              )}
         </RadioGroup>
      </ScrollArea>
    </div>
  );
}