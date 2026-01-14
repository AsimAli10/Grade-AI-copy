"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Rubric, RubricCriterion } from "@/models/index";

type RubricEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rubric?: Rubric | null;
  onSuccess?: (rubricId?: string) => void;
};

export default function RubricEditor({ open, onOpenChange, rubric, onSuccess }: RubricEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    total_points: 100,
    is_template: false,
  });
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [jsonPreview, setJsonPreview] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form when rubric changes or dialog opens
  useEffect(() => {
    if (open) {
      if (rubric) {
        setFormData({
          name: rubric.name || "",
          description: rubric.description || "",
          total_points: rubric.total_points || 100,
          is_template: rubric.is_template || false,
        });
        setCriteria(rubric.criteria || []);
      } else {
        setFormData({
          name: "",
          description: "",
          total_points: 100,
          is_template: false,
        });
        setCriteria([]);
      }
      setJsonError(null);
      setValidationErrors({});
    }
  }, [rubric, open]);

  // Update JSON preview when criteria changes
  useEffect(() => {
    try {
      const rubricData = {
        name: formData.name,
        description: formData.description || null,
        total_points: formData.total_points,
        is_template: formData.is_template,
        criteria: criteria,
      };
      setJsonPreview(JSON.stringify(rubricData, null, 2));
      setJsonError(null);
    } catch (error) {
      setJsonError("Failed to generate JSON preview");
    }
  }, [formData, criteria]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Rubric name is required";
    }

    if (criteria.length === 0) {
      errors.criteria = "At least one criterion is required";
    }

    // Validate each criterion
    criteria.forEach((criterion, index) => {
      if (!criterion.name?.trim()) {
        errors[`criterion_${index}_name`] = "Criterion name is required";
      }
      if (!criterion.description?.trim()) {
        errors[`criterion_${index}_description`] = "Criterion description is required";
      }
      if (criterion.weight === undefined || criterion.weight < 0 || criterion.weight > 100) {
        errors[`criterion_${index}_weight`] = "Weight must be between 0 and 100";
      }
      if (criterion.max_points !== undefined && criterion.max_points < 0) {
        errors[`criterion_${index}_max_points`] = "Max points must be positive";
      }
    });

    // Validate total weight (should be close to 100, but allow flexibility)
    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalWeight === 0 && criteria.length > 0) {
      errors.total_weight = "Total weight cannot be 0";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addCriterion = () => {
    setCriteria([
      ...criteria,
      {
        name: "",
        description: "",
        weight: 0,
        max_points: undefined,
        examples: [],
      },
    ]);
  };

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: any) => {
    const updated = [...criteria];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setCriteria(updated);
    // Clear validation error for this field
    const errorKey = `criterion_${index}_${field}`;
    if (validationErrors[errorKey]) {
      const newErrors = { ...validationErrors };
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const url = rubric ? `/api/rubrics/${rubric.id}` : "/api/rubrics";
      const method = rubric ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          total_points: formData.total_points,
          is_template: formData.is_template,
          criteria: criteria,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save rubric");
      }

      toast({
        title: "Success",
        description: rubric ? "Rubric updated successfully" : "Rubric created successfully",
      });

      const rubricId = data.rubric?.id || rubric?.id;
      onOpenChange(false);
      if (onSuccess) {
        onSuccess(rubricId);
      }
    } catch (error: any) {
      console.error("Error saving rubric:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save rubric",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFromJson = () => {
    try {
      const parsed = JSON.parse(jsonPreview);
      if (parsed.name) setFormData((prev) => ({ ...prev, name: parsed.name }));
      if (parsed.description !== undefined)
        setFormData((prev) => ({ ...prev, description: parsed.description || "" }));
      if (parsed.total_points !== undefined)
        setFormData((prev) => ({ ...prev, total_points: parsed.total_points }));
      if (parsed.is_template !== undefined)
        setFormData((prev) => ({ ...prev, is_template: parsed.is_template }));
      if (Array.isArray(parsed.criteria)) {
        setCriteria(parsed.criteria);
      }
      setJsonError(null);
      toast({
        title: "Success",
        description: "JSON loaded successfully",
      });
    } catch (error) {
      setJsonError("Invalid JSON format");
      toast({
        title: "Error",
        description: "Invalid JSON format",
        variant: "destructive",
      });
    }
  };

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  const totalMaxPoints = criteria.reduce(
    (sum, c) => sum + (c.max_points || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rubric ? "Edit Rubric" : "Create New Rubric"}</DialogTitle>
          <DialogDescription>
            {rubric
              ? "Update the rubric details and criteria below"
              : "Create a new grading rubric with criteria, weights, and descriptions"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Form Builder</TabsTrigger>
            <TabsTrigger value="json">JSON Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4 mt-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Rubric name and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Rubric Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (validationErrors.name) {
                        const newErrors = { ...validationErrors };
                        delete newErrors.name;
                        setValidationErrors(newErrors);
                      }
                    }}
                    placeholder="e.g., Essay Grading Rubric"
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-destructive">{validationErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of the rubric"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_points">Total Points</Label>
                    <Input
                      id="total_points"
                      type="number"
                      min="1"
                      value={formData.total_points}
                      onChange={(e) =>
                        setFormData({ ...formData, total_points: parseFloat(e.target.value) || 100 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="is_template" className="flex items-center gap-2">
                      <input
                        id="is_template"
                        type="checkbox"
                        checked={formData.is_template}
                        onChange={(e) =>
                          setFormData({ ...formData, is_template: e.target.checked })
                        }
                        className="rounded"
                      />
                      Save as Template
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Criteria */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Criteria</CardTitle>
                    <CardDescription>
                      Define grading criteria with weights and descriptions
                    </CardDescription>
                  </div>
                  <Button onClick={addCriterion} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Criterion
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {validationErrors.criteria && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.criteria}</span>
                  </div>
                )}

                {criteria.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No criteria added yet. Click "Add Criterion" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {criteria.map((criterion, index) => (
                      <Card key={index} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Criterion {index + 1}</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCriterion(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label>
                              Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              value={criterion.name || ""}
                              onChange={(e) => updateCriterion(index, "name", e.target.value)}
                              placeholder="e.g., Content Quality"
                            />
                            {validationErrors[`criterion_${index}_name`] && (
                              <p className="text-sm text-destructive">
                                {validationErrors[`criterion_${index}_name`]}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>
                              Description <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              value={criterion.description || ""}
                              onChange={(e) => updateCriterion(index, "description", e.target.value)}
                              placeholder="Describe what this criterion evaluates"
                              rows={2}
                            />
                            {validationErrors[`criterion_${index}_description`] && (
                              <p className="text-sm text-destructive">
                                {validationErrors[`criterion_${index}_description`]}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>
                                Weight (%) <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={criterion.weight || 0}
                                onChange={(e) =>
                                  updateCriterion(index, "weight", parseFloat(e.target.value) || 0)
                                }
                                placeholder="0-100"
                              />
                              {validationErrors[`criterion_${index}_weight`] && (
                                <p className="text-sm text-destructive">
                                  {validationErrors[`criterion_${index}_weight`]}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label>Max Points (optional)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={criterion.max_points || ""}
                                onChange={(e) =>
                                  updateCriterion(
                                    index,
                                    "max_points",
                                    e.target.value ? parseFloat(e.target.value) : undefined
                                  )
                                }
                                placeholder="Optional"
                              />
                              {validationErrors[`criterion_${index}_max_points`] && (
                                <p className="text-sm text-destructive">
                                  {validationErrors[`criterion_${index}_max_points`]}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {criteria.length > 0 && (
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Weight:</span>
                      <Badge variant={totalWeight === 100 ? "default" : "secondary"}>
                        {totalWeight.toFixed(1)}%
                      </Badge>
                    </div>
                    {totalMaxPoints > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Max Points:</span>
                        <Badge variant="outline">{totalMaxPoints.toFixed(1)}</Badge>
                      </div>
                    )}
                    {totalWeight !== 100 && (
                      <p className="text-xs text-muted-foreground">
                        Note: Total weight is {totalWeight.toFixed(1)}%. Consider adjusting to 100%
                        for balanced grading.
                      </p>
                    )}
                    {validationErrors.total_weight && (
                      <p className="text-sm text-destructive">{validationErrors.total_weight}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>JSON Preview</CardTitle>
                    <CardDescription>View and edit the rubric as JSON</CardDescription>
                  </div>
                  <Button onClick={loadFromJson} variant="outline" size="sm">
                    Load from JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>JSON Data</Label>
                  <Textarea
                    value={jsonPreview}
                    onChange={(e) => {
                      setJsonPreview(e.target.value);
                      setJsonError(null);
                    }}
                    className="font-mono text-xs"
                    rows={20}
                  />
                  {jsonError ? (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{jsonError}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Valid JSON</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : rubric ? "Update Rubric" : "Create Rubric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

